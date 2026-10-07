---
title: "Build Management — Build Scripts"
---

# Build Management — Build Scripts

## Introduction

The `tools_build_scripts_build_management` module is the central orchestration layer for building, cleaning, validating, and reporting on all board-specific firmware variants in the Pibot CNC Pendant project. It provides both a command-line and an interactive terminal interface to manage multi-board, multi-variant ESP-IDF firmware builds, enforce CMake option consistency across all board build scripts, and collect post-build memory and flash size reports.

This module is part of the broader [`tools_build_scripts`](tools_build_scripts.md) toolkit. For UI resource generation see [`tools_build_scripts_ui_resources`](tools_build_scripts_ui_resources.md). For other build utilities see [`tools_build_scripts_utilities`](tools_build_scripts_utilities.md).

---

## Architecture

The module is composed of four Python scripts that work together as a pipeline:

```mermaid
graph TD
    A["build_mgr.py\nOrchestrator"] -->|"Validates before any build"| B["validate_build_scripts.py\nCMake Option Guard"]
    A -->|"Dispatches per variant"| C["boards/&lt;board&gt;/build_scripts/build_one.py\nPer-Board Builder"]
    A -->|"Post-build analysis"| D["size_report.py\nSize Metrics Helper"]
    A -->|"After all builds complete"| E["aggregate_size_summary.py\nSummary Aggregator"]
    D -->|"Writes"| F["installer/&lt;variant&gt;/size_report.txt"]
    E -->|"Reads and merges"| F
    E -->|"Writes"| G["installer/size_summary.txt"]
```

### Component Roles

| Script | Role |
|---|---|
| `build_mgr.py` | Top-level orchestrator: CLI and interactive mode, variant discovery, build dispatch, summary generation |
| `validate_build_scripts.py` | Pre-build guard: verifies `ROOT_CMAKE_OPTIONS` in every board's `variants.py` is consistent with root `CMakeLists.txt` |
| `size_report.py` | Post-build helper: runs `idf.py size`, parses results (JSON with text fallback), writes per-variant reports |
| `aggregate_size_summary.py` | Standalone aggregator: re-reads all `size_report.txt` files from disk and writes a unified `size_summary.txt` |

---

## Variant Discovery

Board variants are **not hardcoded** in `build_mgr.py`. The manager discovers them dynamically by scanning the `boards/` directory for each board's `build_scripts/variants.py`. This keeps the orchestrator decoupled from board-specific details.

```mermaid
flowchart TD
    Start(["collect_variants()"])
    Start --> ListBoards["List boards/ directory"]
    ListBoards --> ForEachBoard["For each board directory"]
    ForEachBoard --> CheckFiles{"variants.py and\nbuild_one.py exist?"}
    CheckFiles -->|No| Skip["Skip board"]
    Skip --> ForEachBoard
    CheckFiles -->|Yes| LoadMod["Load variants.py module"]
    LoadMod --> MergeVars["Merge FACTORY_VARIANTS + VARIANTS dicts\n(factory entries first)"]
    MergeVars --> RegisterTargets["Register 'board/variant' key\nin targets dict"]
    RegisterTargets --> AliasCheck{"Short alias already\nin aliases?"}
    AliasCheck -->|No| AddAlias["Add short alias → entry"]
    AliasCheck -->|Yes| MarkAmbiguous["Mark alias → None\n(ambiguous)"]
    AddAlias --> ForEachBoard
    MarkAmbiguous --> ForEachBoard
    ForEachBoard --> Return(["Return (targets, aliases)"])
```

Each discovered target is stored under two keys:

- **Full key**: `"board_name/variant_name"` — always unambiguous, usable directly on the CLI.
- **Alias key**: `"variant_name"` — a short-form alias. Set to `None` (ambiguous) if the same variant name appears on multiple boards; the user must use the full `board/variant` form in that case.

Board `variants.py` files define two dicts consumed during discovery:

| Dict | Purpose |
|---|---|
| `FACTORY_VARIANTS` | Factory firmware variants (bootloader, partitions, OTA initial image) |
| `VARIANTS` | Normal application firmware variants |

See the [Board Support Packages](Board_Support_Packages.md) documentation for the structure of per-board `variants.py`, `common.py`, and `build_one.py`.

---

## Build Pipeline

### Full Orchestration Flow

```mermaid
sequenceDiagram
    participant User
    participant build_mgr as build_mgr.py
    participant validate as validate_build_scripts.py
    participant build_one as build_one.py (per board)
    participant idf as idf.py (ESP-IDF)
    participant size_report as size_report.py
    participant aggregate as aggregate_size_summary.py

    User->>build_mgr: --build_all / --build_board / --build_variant
    build_mgr->>validate: run_validation()
    validate->>validate: Parse ROOT_CMAKE_OPTIONS from all variants.py files
    validate->>validate: Parse OPTION() declarations from CMakeLists.txt
    validate-->>build_mgr: OK (return 0) or exit(1) on mismatch

    build_mgr->>build_mgr: collect_variants() then resolve selected targets
    build_mgr->>build_mgr: Sort: FACTORY_VARIANTS first, then by board/variant name

    loop For each selected variant
        build_mgr->>build_one: subprocess python build_one.py variant [--dev] [--jobs=N]
        build_one->>idf: idf.py build (CMake configure + compile + link)
        idf-->>build_one: ELF and binary artifacts
        build_one-->>build_mgr: returncode 0 = success

        alt Build succeeded
            build_mgr->>size_report: run_idf_size_json(build_dir, cwd)
            size_report->>idf: idf.py -B build_dir size --format json --output-file tmp.json
            idf-->>size_report: JSON metrics (or text fallback)
            size_report-->>build_mgr: Dict[str, Optional[int]] metrics
            build_mgr->>size_report: write_variant_report(installer_dir, label, metrics)
            size_report-->>size_report: installer/variant/size_report.txt written
            Note over build_mgr: For normal variants only: re-invoke copy_factory_artifacts()<br/>to restore files overwritten by idf.py size cmake re-run
        else Build failed
            build_mgr->>build_mgr: _write_failed_variant_report(installer_dir, label)
            Note over build_mgr: Writes FAILED marker so aggregator sees the failure
        end
    end

    build_mgr->>aggregate: aggregate_size_summary.main()
    aggregate->>aggregate: Walk installer/ and parse all size_report.txt files
    aggregate->>size_report: write_summary(repo_root, reports)
    aggregate-->>build_mgr: installer/size_summary.txt path

    build_mgr-->>User: Build summary table and process exit code
```

### Variant Sort Order

`run_all()` sorts selected targets so that **factory variants are always built before normal variants**. This ensures bootloader, partition table, and OTA initial-image artifacts exist before any normal installer attempts to bundle them.

```python
# Sort key in run_all(): factory variants → 0, others → 1; then board name, then variant name
selected = sorted(selected, key=lambda e: (0 if "factory" in e[2] else 1, e[1], e[2]))
```

---

## CMake Option Validation

Before any build or check, `build_mgr.py` unconditionally runs `validate_build_scripts.py` (skipped only for `--list`). This prevents wasted compile time when a build script references a CMake option that does not exist in `CMakeLists.txt`, which would silently produce a misconfigured firmware.

```mermaid
flowchart TD
    A(["validate_build_scripts.main()"])
    A --> B["collect_root_option_table()\nParse ROOT_CMAKE_OPTIONS = [...]\nfrom every boards/*/build_scripts/variants.py"]
    B --> C["collect_cmake_options()\nParse OPTION(NAME ...) lines\nfrom root CMakeLists.txt"]
    C --> D{"ROOT_CMAKE_OPTIONS\nmatches CMakeLists.txt?"}
    D -->|"Missing options\nin CMake but not in list"| E["Report: Missing from ROOT_CMAKE_OPTIONS"]
    D -->|"Stale options\nin list but not in CMake"| F["Report: Stale entries"]
    E --> Z["return 1 → build_mgr exits before any build"]
    F --> Z
    D -->|"Sets match"| G["collect_build_script_paths()\nAll *.py in boards/*/build_scripts/\nexcluding common.py"]
    G --> H["extract_used_options(path)\nRegex: -DOPTION= patterns\nin each build script"]
    H --> I{"All -D options\nin ROOT_CMAKE_OPTIONS?"}
    I -->|"Invalid options found"| J["Report unsupported CMake options\nper script file"]
    J --> Z
    I -->|"All valid"| K["Print: OK - consistent"]
    K --> Return(["return 0"])
```

**Validation exclusions**: `PROD_BUILD` is excluded from the check. It is managed directly by `build_mgr.py` itself (injected at dispatch time, not via board `ROOT_CMAKE_OPTIONS`).

### What Is Validated

| Check | Source A | Source B | Error Condition |
|---|---|---|---|
| Option completeness | `CMakeLists.txt` `OPTION(...)` names | `ROOT_CMAKE_OPTIONS` lists in all `variants.py` | Option in CMake but not in any board list |
| Option staleness | `ROOT_CMAKE_OPTIONS` in `variants.py` | `CMakeLists.txt` `OPTION(...)` names | Option in board list but removed from CMake |
| Script correctness | `-D<OPTION>=` used in any `*.py` build script | `ROOT_CMAKE_OPTIONS` union set | Script uses an option not declared in CMake |

---

## Size Reporting

After each successful build, `build_mgr.py` collects memory and flash usage metrics via `size_report.py` and writes a human-readable report.

### Metrics Collection Flow

```mermaid
flowchart TD
    A["run_idf_size_json(build_dir, cwd)"]
    A --> B["Read IDF_TARGET from\nCMakeCache.txt in build_dir"]
    B --> C["Set IDF_TARGET in subprocess env\nOverrides any stale shell variable"]
    C --> D["Run: idf.py -B build_dir size\n--format json --output-file tmp.json"]
    D --> E{"JSON output\nsuccessfully written?"}
    E -->|Yes| F["_extract_from_json(data)\nParse flat JSON dict"]
    E -->|"No / returncode != 0"| G["Fallback: idf.py -B build_dir size\nplain text output"]
    G --> H["_parse_text_size_output(stdout)\nRegex on ASCII or Unicode table"]
    F --> I["Dict: dram_used, dram_total, dram_free\niram_used, iram_total, iram_free\nflash_code, flash_data"]
    H --> I
    I --> J["write_variant_report(installer_dir, label, metrics)\nWrites installer/variant/size_report.txt"]
```

### Chip Architecture Handling

The size reporter transparently handles two ESP32 RAM architectures:

| Architecture | Representative Chips | JSON Key | Mapped To |
|---|---|---|---|
| Separate DRAM + IRAM | ESP32 | `dram_total`, `iram_total` | `dram_*` and `iram_*` separately |
| Combined DIRAM | ESP32-S3, ESP32-C3 | `diram_total` | Mapped to `dram_*` (the constrained heap budget) |

### IDF_TARGET Isolation

`run_idf_size_json()` reads the target chip directly from `CMakeCache.txt` and injects it as `IDF_TARGET` into the subprocess environment. This prevents cross-contamination when building multiple boards (which may target different chips) in a single session without clearing shell variables between boards.

### Per-Variant Report Format

Written to `installer/<variant>/size_report.txt`:

```
Size report for pibot_pendant_v1_0/8mb_wifi_fluidnc
======================================================================
DRAM         used=      80,596  total=     180,736  free=     100,140 (44.59%)
IRAM         used=      65,400  total=     131,072  free=      65,672 (49.90%)
Flash Code         648,880
Flash Data          72,400
======================================================================
```

When a build fails, a `FAILED` marker is written instead so the aggregator can detect it:

```
Size report for pibot_pendant_v1_0/8mb_wifi_fluidnc
======================================================================
FAILED
======================================================================
```

### Aggregated Summary

`aggregate_size_summary.py` operates entirely from on-disk `size_report.txt` files. It can be run standalone after a partial or interrupted batch build to regenerate `installer/size_summary.txt` without rebuilding.

```mermaid
flowchart TD
    A(["aggregate_size_summary.main()"])
    A --> B["Walk installer/ directory\nfor all size_report.txt files"]
    B --> C["parse_size_report(path)\nExtract label + DRAM/IRAM/Flash metrics\nvia regex on report text"]
    C --> D{"Report contains\n'FAILED'?"}
    D -->|Yes| E["Store (label, None)\nFAILED row in table"]
    D -->|No| F["Store (label, metrics dict)\nData row in table"]
    E --> G["size_report.write_summary(repo_root, all_reports)"]
    F --> G
    G --> H["Sort: successful variants first,\nfailed last; both alphabetical"]
    H --> I["Format padded table:\nVariant | DRAM used | DRAM free | DRAM % | IRAM free | Flash code | Flash data"]
    I --> J["Write installer/size_summary.txt"]
    J --> K(["Return summary path"])
```

Example aggregated output:

```
Firmware size summary
================================================================
              Variant | DRAM used | DRAM free | DRAM % | IRAM free | Flash code | Flash data
----------------------------------------------------------------
pibot_pendant.../8mb_wifi_fluidnc |    80,596 |   100,140 |  44.6% |    65,672 |    648,880 |     72,400
esp32_3248s035c/4mb_wifi_grbl     |    75,200 |   105,536 |  41.6% |    70,144 |    601,200 |     68,800
================================================================
Generated: 2 ok, 0 failed
```

---

## Interactive Mode

When invoked with no CLI arguments, `build_mgr.py` presents a numbered interactive prompt. Choices from the previous session are restored as defaults (indicated with `<-- last` next to the option and a bracketed default index in the prompt).

```mermaid
flowchart TD
    A(["No CLI args\ninteractive_select()"])
    A --> B["Load .build_mgr_prefs.json\nDefaults to empty dict if missing"]
    B --> C["Numbered prompt:\nSelect action\nBuild / Clean / Check\nLast choice highlighted"]
    C --> D["Numbered prompt:\nSelect board\nAll boards or specific board\nLast choice highlighted"]
    D --> E{"All boards\nselected?"}
    E -->|Yes| F["selected = all discovered targets"]
    E -->|No| G["Numbered prompt:\nSelect variant for that board\nAll variants or specific variant\nLast choice highlighted"]
    G --> H["selected = matching subset of targets"]
    F --> I{"action == build?"}
    H --> I
    I -->|Yes| J["Yes/No prompt: Dev mode?\nKeep logging and snapshot enabled"]
    I -->|No| K["Yes/No prompt: Stop on first error?"]
    J --> K
    K --> L["Save prefs to .build_mgr_prefs.json\nKeys: action, scope, variant, dev, stop_on_error"]
    L --> M(["run_all(selected, do_clean, do_check,\ndev_mode, stop_on_error)"])
```

Preferences are stored at `tools/build_scripts/.build_mgr_prefs.json`. The file is created automatically on first interactive run and is gitignored.

---

## CLI Reference

```bash
python tools/build_scripts/build_mgr.py [MODE FLAG] [MODIFIERS]
```

### Mode Flags (mutually exclusive)

| Flag | Description |
|---|---|
| *(no flag)* | Launch interactive mode |
| `--list` / `--list-all` | List all discovered boards and variants |
| `--build_all` | Build all variants across all boards |
| `--build_board BOARD` | Build all variants for one board |
| `--build_variant VARIANT` | Build one variant; use `board/variant` if ambiguous |
| `--clean_all` | Remove build + installer dirs for all variants (no rebuild) |
| `--clean_board BOARD` | Clean all variants for one board |
| `--clean_variant VARIANT` | Clean one variant |
| `--check_all` | Validate scripts + `idf.py reconfigure` for all variants (no compilation) |
| `--check_board BOARD` | Check all variants for one board |
| `--check_variant VARIANT` | Check one variant |

### Modifier Flags

| Flag | Description |
|---|---|
| `--dev` | Dev mode: keeps dev tools enabled (logging, snapshot). Default: `PROD_BUILD=ON` disables all dev tools |
| `--stop_on_error` | Exit immediately after first build failure |
| `--jobs N` | Pass `-j N` to `idf.py`/ninja. Reduce if GCC internal-compiler-error crashes occur under memory pressure |

### Usage Examples

```bash
# List all available boards and variants
python tools/build_scripts/build_mgr.py --list

# Build all variants in production mode across all boards
python tools/build_scripts/build_mgr.py --build_all

# Build one board, stop immediately if any variant fails
python tools/build_scripts/build_mgr.py --build_board pibot_pendant_v1_0 --stop_on_error

# Build a variant by short name (only works if unique across all boards)
python tools/build_scripts/build_mgr.py --build_variant 8mb_wifi_fluidnc

# Build a variant on a specific board using the unambiguous full form
python tools/build_scripts/build_mgr.py --build_variant pibot_pendant_v1_0/8mb_wifi_fluidnc

# Build with dev tools enabled and 4 parallel compile jobs
python tools/build_scripts/build_mgr.py --build_all --dev --jobs 4

# Clean all boards (removes build + installer dirs; does NOT rebuild)
python tools/build_scripts/build_mgr.py --clean_all

# CMake-only check: validate scripts and reconfigure without compiling
python tools/build_scripts/build_mgr.py --check_all

# Re-aggregate size reports from disk without rebuilding
python tools/build_scripts/aggregate_size_summary.py
```

---

## Directory and File Conventions

```
tools/build_scripts/
├── build_mgr.py                    # Orchestrator (this module)
├── validate_build_scripts.py       # CMake option guard (runs before every build)
├── size_report.py                  # Size reporting helpers (idf.py size wrapper)
├── aggregate_size_summary.py       # Standalone disk-based report aggregator
└── .build_mgr_prefs.json           # Interactive mode preferences (auto-created, gitignored)

boards/
└── <board_name>/
    └── build_scripts/
        ├── variants.py             # Defines FACTORY_VARIANTS, VARIANTS, ROOT_CMAKE_OPTIONS
        ├── common.py               # Board helpers: build_variant, check_variant, installer_dir_for
        └── build_one.py            # Entry point invoked by build_mgr per variant

installer/                          # Generated artifacts (gitignored)
├── <variant_name>/
│   ├── size_report.txt             # Per-variant memory/flash report (or FAILED marker)
│   └── *.bin, *.json, ...          # Flashable firmware files produced by CMake
└── size_summary.txt                # Aggregated table across all variants
```

---

## Key Design Decisions

### Validation Before Every Build

`validate_build_scripts.py` is invoked unconditionally before dispatching any build or check operation (but not before `--list`). This catches `ROOT_CMAKE_OPTIONS` drift early — before any variant is compiled — rather than silently building with wrong feature flags after a `CMakeLists.txt` option rename.

### Factory-First Build Ordering

`run_all()` sorts selected targets so all factory variants complete before any normal firmware variant. Factory builds produce the bootloader binary, partition table, and OTA initial image that firmware installers bundle. Without this ordering, a normal installer could package stale or missing factory components.

### Factory Artifact Restoration After Size Reporting

Running `idf.py size` internally re-triggers CMake, which may re-execute firmware post-build hooks and overwrite factory artifacts copied into the normal firmware's installer directory. For **normal** variants only (those whose `cwd` is the repo root), `build_mgr.py` re-invokes `copy_factory_artifacts()` from the board's `common.py` after size collection to restore them. Factory variants themselves must never call this — their own installer directory has no cross-board factory artifact relationship.

### IDF_TARGET Isolation in Size Reporting

Multi-board sessions build different chips (ESP32, ESP32-S3, ESP32-C3) in sequence. If `IDF_TARGET` is set in the shell from a previous board, `idf.py size` would reject the mismatch and fail. `size_report.py` reads the actual target from `CMakeCache.txt` and forces it in the subprocess environment, making size collection immune to shell state between boards.

### Disk-Based Aggregation

`aggregate_size_summary.py` reads `size_report.txt` files from disk rather than collecting live metrics. This enables re-running the aggregation after a partial or interrupted batch build without rebuilding, and allows partial builds where only a subset of variants are refreshed while others retain their last written report.

---

## Relationships to Other Modules

| Module | Relationship |
|---|---|
| [Board Support Packages](Board_Support_Packages.md) | Each board's `build_scripts/` directory is the discovery source for `collect_variants()`. The `variants.py`, `common.py`, and `build_one.py` files define the per-board side of this build system. |
| [tools_build_scripts_ui_resources](tools_build_scripts_ui_resources.md) | Sibling module for generating UI resource partitions (images, fonts, themes). Operated independently from firmware builds but writes artifacts under the same `installer/` convention. |
| [tools_build_scripts_utilities](tools_build_scripts_utilities.md) | Sibling module containing supporting utilities: OTA initial image generation, sdkconfig splitting, and PNG-to-LVGL conversion. |
