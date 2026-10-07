---
title: "Tools: Resource Generation"
---

# Tools: Resource Generation

Developer-facing offline tooling for generating, converting, and auditing the
three categories of UI assets consumed by the firmware at runtime: **fonts**,
**images**, and **language packs**.

These scripts run on a host PC, not on the ESP32. They produce binary artefacts
that are either flashed inside the `ui_resources` partition or deployed via the
SD-card update workflow documented in
[`docs/ui_resources/development.md`](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md).

---

## Module Overview

```
tools/
├── fonts/                        # Font conversion tools
│   ├── font_c_to_fnt.py          # LVGL .c  → .fnt blob (cross-check path)
│   └── ttf_to_fnt.py             # TTF/OTF  → .fnt blob (primary authoring path)
├── images/                       # Image conversion tools
│   └── image_c_to_bin.py         # LVGL image .c → .bin (cross-check path)
├── images_converter/             # Snapshot diagnostic tools
│   ├── raw2png.py                # Single ESP32 .raw snapshot → PNG
│   └── raws2pngs.py              # Batch wrapper around raw2png.py
└── language_packs/               # Localisation tooling
    ├── audit_translations.py     # Detect unused / undefined translation IDs
    └── build_template.py         # Generate template.lng from *_defs.inc
```

Three tool families, three asset kinds:

| Family | Asset kind | Runtime consumer |
|--------|-----------|-----------------|
| `fonts/` | `.fnt` binary blob | `esp3d_resources.cpp` → LVGL font loader |
| `images/` + `images_converter/` | `.bin` image / PNG snapshot | UI icons; screen snapshot debug |
| `language_packs/` | `.lng` / `template.lng` | `ESP3DTranslationService` |

---

## Architecture

```mermaid
graph TD
    subgraph Host["Host PC Tools (tools_resource_generation)"]
        subgraph FT["fonts/"]
            ttf_to_fnt["ttf_to_fnt.py\n(FreeType + fontTools)"]
            font_c_to_fnt["font_c_to_fnt.py\n(lv_font_conv cross-check)"]
        end
        subgraph IMG["images/"]
            img_c_to_bin["image_c_to_bin.py\n(LVGL .c → .bin)"]
        end
        subgraph IC["images_converter/"]
            raw2png["raw2png.py\n(ESP32 snapshot → PNG)"]
            raws2pngs["raws2pngs.py\n(batch wrapper)"]
        end
        subgraph LP["language_packs/"]
            build_template["build_template.py\n(→ template.lng)"]
            audit_translations["audit_translations.py\n(codebase audit)"]
        end
    end

    subgraph BS["tools/build_scripts (sibling module)"]
        lv_font_c_parser["lv_font_c_parser.py"]
        font_blob["font_blob.py"]
        generate_resources["generate_resources.py\n(main pipeline)"]
        pkg_kit["package_user_resources_kit.py"]
    end

    subgraph SRC["Source assets"]
        TTF["TTF / OTF / WOFF\nfont files"]
        LV_C_FONT["lv_font_conv .c\nfont files"]
        LV_C_IMG["LVGL image .c\nfiles"]
        RAW_FILES["ESP32 .raw\nsnapshot files"]
        DEFS_INC["*_defs.inc\ntranslation macros"]
        SRC_CODE["C++ source files\n(ESP3DLabel:: usages)"]
    end

    subgraph FW["Firmware / Partition"]
        FNT_BLOB[".fnt blob\n(ui_resources partition)"]
        BIN_BLOB[".bin image blob"]
        LNG_TEMPLATE["template.lng\n(shipped with kit)"]
        LNG_PACK[".lng language pack\n(SD card / flash)"]
        PNG_OUT["PNG image\n(debug viewing)"]
    end

    TTF --> ttf_to_fnt
    LV_C_FONT --> font_c_to_fnt
    LV_C_FONT --> lv_font_c_parser

    lv_font_c_parser --> font_c_to_fnt
    lv_font_c_parser --> ttf_to_fnt
    font_blob --> font_c_to_fnt
    font_blob --> ttf_to_fnt

    font_c_to_fnt --> FNT_BLOB
    ttf_to_fnt --> FNT_BLOB
    FNT_BLOB --> generate_resources

    LV_C_IMG --> img_c_to_bin
    img_c_to_bin --> BIN_BLOB

    RAW_FILES --> raw2png
    raw2png --> PNG_OUT
    raws2pngs --> raw2png

    DEFS_INC --> build_template
    DEFS_INC --> audit_translations
    SRC_CODE --> audit_translations
    build_template --> LNG_TEMPLATE
    LNG_TEMPLATE --> LNG_PACK

    pkg_kit --> LNG_TEMPLATE
```

---

## Component Groups

### 1. Font Tools (`tools/fonts/`)

Produce `.fnt` binary blobs that are registered in the `ui_resources`
partition and loaded at runtime by `esp3d_resources.cpp`.
See [development.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) for the blob format specification and
[ui_resources_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/ui_resources_guide.md) for the end-to-end workflow.

Both tools share the same output format via the shared library pair from
[tools_build_scripts.md](tools_build_scripts.md):

| Shared lib | Role |
|------------|------|
| `lv_font_c_parser.py` | Parses `lv_font_conv`-generated `.c` files into a `ParsedFont` struct |
| `font_blob.py` | Serialises a `ParsedFont` into the binary `.fnt` blob |

The tools locate these files automatically: first looking in
`tools/build_scripts/`, then falling back to the same directory (flat
`ui_resources_kit` layout produced by `package_user_resources_kit.py`).

#### `font_c_to_fnt.py` — LVGL C → .fnt

Converts an existing `lv_font_conv`-generated `.c` file **directly** to a
`.fnt` blob without a manifest entry or Node.js toolchain. Its primary use
is as a **cross-check reference** against `ttf_to_fnt.py`.

```bash
python font_c_to_fnt.py --c orbitron_10.c --out orbitron_10.fnt
```

**Process flow:**

```mermaid
flowchart LR
    A[".c file\n(lv_font_conv output)"] --> B["parse_font_c_file()\nlv_font_c_parser.py"]
    B --> C["ParsedFont\nstruct"]
    C --> D["build_font_blob()\nfont_blob.py"]
    D --> E[".fnt binary blob"]
```

#### `ttf_to_fnt.py` — TTF/OTF → .fnt

Pure-Python TTF/OTF/WOFF → `.fnt` converter using **FreeType** for
rasterisation and **fontTools** for GPOS kerning. No Node.js or
`lv_font_conv` required. Supports merging multiple source fonts into a single
output (e.g. Orbitron for text glyphs + FontAwesome for icon glyphs).

```bash
# Single font
python ttf_to_fnt.py --font Orbitron-Bold.ttf --range "32-126,176,192-253" \
    --size 10 --bpp 4 --out orbitron_10.fnt

# Merged: icon subset from a second font in the same .fnt
python ttf_to_fnt.py --size 14 --bpp 4 \
    --font Orbitron-Bold.ttf   --range "32-126,176,192-253" \
    --font FontAwesome.woff    --range "61451,61452,61787" \
    --out orbitron_14.fnt
```

Key implementation details verified byte-exact against `lv_font_conv`:

| Detail | Implementation |
|--------|---------------|
| FreeType load flags | `FT_LOAD_FORCE_AUTOHINT \| FT_LOAD_TARGET_LIGHT` |
| Advance width | `linearHoriAdvance / 65536 * 16` (unhinted, 1/16 px fixed-point) |
| `line_height` / `base_line` | Derived from rendered ink extents, not face metrics |
| `underline_position/thickness` | Design-unit metrics, truncated toward zero |
| Cmap splitting | DP algorithm ported from `lv_font_conv`'s `cmap_build_subtables.js` |
| Kerning source | GPOS PairPos Format 1 & 2 via fontTools (not legacy `kern` table) |
| Glyph packing | Tight rows, byte-aligned glyph start (`stride=1`, `align=1`) |
| Multi-font merging | Earlier `--font` args win on duplicate codepoints; glyph IDs are global, sorted by codepoint |

**Process flow:**

```mermaid
flowchart TD
    A["Source fonts\n(TTF/OTF/WOFF)\n+ codepoint ranges"] --> B["FreeType\nrasterize_glyph()"]
    B --> C["glyph_bitmap\n(packed samples)"]
    B --> D["GlyphDsc list"]
    A --> E["fontTools\ngpos_kern_pairs()"]
    E --> F["kern_pairs dict\n(scaled to px)"]
    D --> G["_split_cmap_blocks()\nDP: byte-minimal partition\nformat0_tiny / format0 / sparse_tiny"]
    G --> H["CmapEntry list"]
    C & D & H & F --> I["ParsedFont\nstruct"]
    I --> J["build_font_blob()\nfont_blob.py"]
    J --> K[".fnt binary blob"]
```

---

### 2. Image Tools (`tools/images/`)

#### `image_c_to_bin.py` — LVGL image .c → .bin

Converts an LVGL `lv_image_dsc_t` `.c` file into the 12-byte header + raw
pixel payload `.bin` that `LVGLImage.py --ofmt BIN` would produce. Use case:
**diff-check** a committed `.c` icon against its source PNG without
re-running the full icon pipeline.

```bash
python image_c_to_bin.py --c back_b.c --out back_b.bin
```

**Binary header layout (12 bytes, little-endian):**

```
Offset  Size  Field
  0       1   magic  = 0x19
  1       1   cf     (color format code, see table below)
  2       2   flags  (u16)
  4       2   w      (u16, pixels)
  6       2   h      (u16, pixels)
  8       2   stride (u16, bytes per row)
 10       2   reserved
 12       ?   raw pixel data (palette + pixels for indexed; pixels only otherwise)
```

Supported `LV_COLOR_FORMAT_<NAME>` values:
`UNKNOWN`, `RAW`, `RAW_ALPHA`, `L8`, `I1`–`I8`, `A1`–`A8`, `ARGB8888`,
`XRGB8888`, `RGB565`, `ARGB8565`, `RGB565A8`, `RGB888`.

---

### 3. Image Converter Tools (`tools/images_converter/`)

These tools deal with **screen snapshots** captured by the firmware at
runtime (triggered through the factory app or debug hooks) and stored on SD
card as `.raw` files. See `gfx_snapshot_begin` / `gfx_snapshot_end` in the
board-specific factory `gfx.c` files for the capture side.

#### `raw2png.py` — Single snapshot converter

`ESP32RawConverter` wraps the full conversion pipeline; `main()` provides the
CLI.

```bash
python raw2png.py screen.raw                   # → screen.png
python raw2png.py screen.raw -o debug.png      # explicit output name
python raw2png.py -d ./screenshots/            # built-in batch mode
```

**ESP32 RAW file format:**

```
Offset  Size  Field
  0       4   Signature: b'E3D\x00'
  4       4   Width   (uint32 LE)
  8       4   Height  (uint32 LE)
 12       4   Format  (uint32 LE): 0 = RGB565, 1 = RGB888
 16       4   Reserved
 20       ?   Pixel data
              RGB565: 2 bytes/pixel  → total = w × h × 2
              RGB888: 4 bytes/pixel  → total = w × h × 4
```

**RGB565 → RGB888 conversion:**

```mermaid
flowchart LR
    A["RGB565\nuint16 numpy array"] --> B["Bit-extract\nR5 = px >> 11\nG6 = px >> 5 & 0x3F\nB5 = px & 0x1F"]
    B --> C["Bit-expand\nR8 = R5<<3 | R5>>2\nG8 = G6<<2 | G6>>4\nB8 = B5<<3 | B5>>2"]
    C --> D["numpy stack\nHxWx3 uint8"]
    D --> E["PIL Image\n→ PNG"]
```

#### `raws2pngs.py` — Batch processor

`BatchRawProcessor` invokes `raw2png.py` as a subprocess for each `.raw` file
found in the configured input directory.

```bash
python raws2pngs.py                            # convert raw/ → png/
python raws2pngs.py --script ../raw2png.py     # custom script path
python raws2pngs.py --list                     # list files, no conversion
python raws2pngs.py --clean                    # remove all PNG output
```

**Expected directory layout:**

```
working_dir/
├── raw/         ← input .raw files (copied from SD card)
│   ├── snap_001.raw
│   └── snap_002.raw
├── png/         ← output PNGs (auto-created)
│   ├── snap_001.png
│   └── snap_002.png
├── raw2png.py
└── raws2pngs.py
```

---

### 4. Language Pack Tools (`tools/language_packs/`)

The firmware's translation system relies on two artefacts:

- **`*_defs.inc` files** — define every `ESP3DLabel` enum value alongside its
  default English text via `ESP3D_TR_DEF(label, id, "text")` macros.
- **`.lng` language pack files** — key-value files (`l_<id>=<translated text>`)
  loaded at runtime by `ESP3DTranslationService`.

For the runtime architecture see `ESP3DTranslationService` in
[Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md).

#### Translation ID ranges

| Range | Category | Source file |
|-------|----------|-------------|
| `0 – 499` | Core UI translations | `esp3d_translations_defs.inc` |
| `500 – 999` | CNC system translations | `esp3d_system_translations_defs.inc` |
| `1000+` | Target firmware translations | `esp3d_target_translations_defs.inc` (one per target) |

> **Note on target range:** Multiple target `.inc` files may reuse the same
> `1000`-range IDs with identical label/text because only one CNC target is
> compiled at a time. `build_template.py` merges all targets into the
> template (de-duplicating identical entries, erroring on conflicting ones)
> so a single `.lng` file can serve any firmware build.

#### `build_template.py` — Generate `template.lng`

```bash
cd tools/language_packs
python build_template.py
# → template.lng        (for distribution to translators)
# → migration_map.txt   (label → numeric ID lookup aid)
```

**Process flow:**

```mermaid
flowchart TD
    A["*_defs.inc files\n(core + system + all targets)"] --> B["parse_defs_file()\nESP3D_TR_DEF regex\nskips // comments"]
    B --> C["All (label, id, text) entries\nmerged across files"]
    C --> D["validate_entries()\nwarn on ID-range gaps"]
    D --> E["generate_template()\nsort by ID\nde-duplicate identical target entries\nerror on conflicting IDs"]
    E --> F["template.lng\n[translations] + [info] sections"]
    E --> G["migration_map.txt\nlabel = l_ID"]
```

**Output `template.lng` structure:**

```ini
[translations]
# Core translations (0-499)
l_0=English
l_1=Settings
...
# System translations (500-999)
l_500=Position
...
# Target translations (1000+)
l_1000=FluidNC
...

[info]
code=<code>
name=<name>
target_slot=<1|2|3>
creator=<creator>
creation_date=<creation_date>
maintainer=<maintainer>
last_update=<last_update>
target_language=<target_language>
target_version=3.0
```

#### `audit_translations.py` — Codebase translation audit

Detects four classes of issues by cross-referencing definition files against
all C++/C/H source files under `main/`:

| Issue class | Description | Exit |
|------------|-------------|------|
| **Unused** | `ESP3D_TR_DEF` entry with no `ESP3DLabel::xxx` in source | 0 (warn) |
| **Undefined** | `ESP3DLabel::xxx` in source but missing from `.inc` | 1 (error) |
| **Duplicate IDs** | Same numeric ID in two different `ESP3D_TR_DEF` entries | 1 (error) |
| **Duplicate texts** | Same default English text in multiple entries (may be intentional) | 0 (info) |

```bash
cd tools/language_packs
python audit_translations.py                        # default paths
python audit_translations.py \
    --main-dir ../../main --defs-dir ../../main/display
python audit_translations.py -o report.txt          # save report
python audit_translations.py -e unused.csv          # export unused IDs to CSV
```

The scanner intentionally skips:
- Lines starting with `//`, `/*`, or `*` (comments)
- Lines starting with `#define` (macro definition sites)
- Labels `unknown_index` and `label` (enum sentinels)
- Lines containing `ESP3D_TR_DEF` (definition sites, not usage sites)

**Audit data-flow:**

```mermaid
flowchart TD
    A["*_defs.inc files"] --> B["parse_all_definitions()\nfind_defs_files() walk"]
    B --> C["definitions dict\nlabel → TranslationDef"]

    D["main/ source tree\n.cpp .c .h .inc"] --> E["scan_directory_for_usage()\nESP3DLabel::\\w+ regex\nskip comments & defines"]
    E --> F["usages dict\nlabel → list[TranslationUsage]"]

    C & F --> G["find_unused_translations()\ndefined_labels − used_labels"]
    C & F --> H["find_undefined_usages()\nused_labels − defined_labels"]
    C --> I["find_duplicate_ids()\ngroup by numeric ID"]
    C --> J["find_duplicate_texts()\ngroup by normalised text"]

    G & H & I & J --> K["generate_report()"]
    K --> L["Console / .txt file\nexit 0 or 1"]
```

---

## Dependency Map

```mermaid
graph LR
    subgraph This["tools_resource_generation"]
        ttf["ttf_to_fnt.py"]
        fc2fnt["font_c_to_fnt.py"]
        ic2bin["image_c_to_bin.py"]
        r2p["raw2png.py"]
        r2ps["raws2pngs.py"]
        bt["build_template.py"]
        at["audit_translations.py"]
    end

    subgraph BS["tools_build_scripts"]
        parser["lv_font_c_parser.py"]
        blob["font_blob.py"]
    end

    subgraph Ext["External Python libs"]
        FT["freetype-py"]
        FTL["fontTools"]
        PIL["Pillow"]
        NP["numpy"]
    end

    subgraph FWSrc["Firmware source"]
        DEFS["*_defs.inc\n(translation macros)"]
        SRC["main/ C++ source\n(ESP3DLabel:: usages)"]
    end

    fc2fnt --> parser & blob
    ttf --> parser & blob & FT & FTL
    r2p --> PIL & NP
    r2ps --> r2p
    bt --> DEFS
    at --> DEFS & SRC
```

---

## Integration with the Main Resource Pipeline

These tools are **authoring and debugging aids**, not part of the automated
build pipeline. The relationship to the main pipeline in
[tools_build_scripts.md](tools_build_scripts.md):

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant ttf as ttf_to_fnt.py
    participant fc2f as font_c_to_fnt.py
    participant gen as generate_resources.py<br/>(build_scripts)
    participant fw as Firmware<br/>(ui_resources partition)

    Note over Dev,fw: Font authoring and verification workflow
    Dev->>ttf: python ttf_to_fnt.py --font F.ttf ...
    ttf-->>Dev: orbitron_10.fnt (candidate)
    Dev->>fc2f: python font_c_to_fnt.py --c orbitron_10.c
    fc2f-->>Dev: orbitron_10.fnt (reference from .c)
    Note over Dev: diff both .fnt files to verify byte-exact match

    Note over Dev,fw: Production build (automated, CI)
    Dev->>gen: python generate_resources.py --variant ...
    Note over gen: reads resources_config.py<br/>uses lv_font_c_parser + font_blob<br/>for all configured fonts/images
    gen-->>fw: ui_resources.bin (flashed to device)
```

For language packs:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant at as audit_translations.py
    participant bt as build_template.py
    participant Tr as Translator
    participant SD as SD card / flash

    Dev->>at: python audit_translations.py
    at-->>Dev: Report: unused / undefined IDs
    Note over Dev: Fix errors in *_defs.inc or source, commit

    Dev->>bt: python build_template.py
    bt-->>Dev: template.lng + migration_map.txt
    Dev->>Tr: Distribute template.lng
    Tr->>Tr: Fill in translations → fr.lng
    Tr->>SD: Deploy via SD-card update workflow
```

---

## Quick Reference

### Font tools

```bash
# TTF → .fnt  (primary authoring path; no Node.js required)
python tools/fonts/ttf_to_fnt.py \
    --font Orbitron-Bold.ttf --range "32-126,176,192-253" \
    --size 10 --bpp 4 --out orbitron_10.fnt

# LVGL .c → .fnt  (cross-check / reference, no Node.js required)
python tools/fonts/font_c_to_fnt.py \
    --c resources/fonts/res_320_240/orbitron_10.c \
    --out orbitron_10_ref.fnt
```

### Image tools

```bash
# LVGL image .c → .bin  (cross-check against source PNG)
python tools/images/image_c_to_bin.py --c resources/icons/back_b.c
```

### Snapshot converter

```bash
# Single file
python tools/images_converter/raw2png.py snap_001.raw

# Batch (run from images_converter/; expects a raw/ sub-directory)
python tools/images_converter/raws2pngs.py
```

### Language pack tools

```bash
cd tools/language_packs
python build_template.py                           # generate template.lng
python audit_translations.py                       # audit the whole codebase
python audit_translations.py -o audit_report.txt   # save report to file
python audit_translations.py -e unused.csv         # export unused IDs to CSV
```

---

## Related Documentation

| Document | Topic |
|----------|-------|
| [development.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/development.md) | `.fnt` / `.bin` binary blob format, `ui_resources` partition layout, full build pipeline |
| [ui_resources_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/guides/ui_resources_guide.md) | End-to-end guide: add/modify icons and fonts, regenerate and flash the partition |
| [tools_build_scripts.md](tools_build_scripts.md) | `generate_resources.py`, `resources_config.py`, `package_user_resources_kit.py` |
| [theme_palette.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/theme_palette.md) | Colour token system (separate resource type in the same partition) |
| [ui_style_guide.md](https://github.com/luc-github/Pibot-cnc-pendant-firmware/blob/main/docs/ui_resources/ui_style_guide.md) | LVGL style system; where generated icons and fonts are applied |
| [Core_Platform_&_Infrastructure.md](Core_Platform_and_Infrastructure.md) | `ESP3DTranslationService` runtime (language pack consumer) |
