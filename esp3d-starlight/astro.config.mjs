import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeGalaxy from 'starlight-theme-galaxy';
import astroRehypeMermaid from './integrations/astro-rehype-mermaid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://esp3d.io',
  base: '/',

  vite: {
    resolve: {
      alias: {
        /** Windows: `'/src'` resolves to `C:\\src`, not this project — breaks `~/…` imports in dev. */
        '~': path.resolve(__dirname, 'src'),
      },
    },
  },

  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
  },

  integrations: [
    astroRehypeMermaid({
      strategy: 'inline-svg',
      dark: true,
    }),
    starlight({
      plugins: [starlightThemeGalaxy()],
      title: 'ESP3D Ecosystem',
      description: 'Official documentation of the ESP3D Ecosystem',
      logo: {
        src: './src/assets/logo.png',
        alt: 'ESP3D Logo',
        replacesTitle: true,
      },

      components: {
        /** Prev/next aussi sous la TOC (footer inchangé). */
        PageSidebar: './src/components/PageSidebar.astro',
        Pagination: './src/components/Pagination.astro',
      },

      sidebar: [
        { label: 'ESP3D Ecosystem', link: '/', attrs: { class: 'sidebar-ecosystem-root' } },
        {
          label: 'ESP3D',
          collapsed: true,
          items: [
            { label: 'What Is ESP3D?', link: '/esp3d/' },
            {
              label: 'ESP3D Version 2.1.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3d/version-21x/' },
                { label: 'Credits', link: '/esp3d/version-21x/credits/' },
                { label: 'Features', link: '/esp3d/version-21x/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-21x/hardware/' },
                    {
                      label: 'ESP Boards',
                      collapsed: true,
                      items: [
                        {
                          label: 'ESP32',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-21x/hardware/esp_boards/esp32' },
                        },
                        {
                          label: 'ESP8266',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-21x/hardware/esp_boards/esp8266' },
                        },
                        {
                          label: 'ESP8285',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-21x/hardware/esp_boards/esp8285' },
                        },
                      ],
                    },
                    {
                      label: 'System Boards',
                      collapsed: true,
                      items: [
                        {
                          label: 'Main boards',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-21x/hardware/system_boards/main_boards' },
                        },
                        {
                          label: 'TFT',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-21x/hardware/system_boards/tft' },
                        },
                      ],
                    },
                  ],
                },
                {
                  label: 'Installation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-21x/installation/' },
                    { label: 'Arduino IDE', link: '/esp3d/version-21x/installation/arduino/' },
                    { label: 'PlatformIO', link: '/esp3d/version-21x/installation/vscode-platformio/' },
                    { label: 'Configuration', link: '/esp3d/version-21x/installation/configuration/' },
                  ],
                },
                { label: 'Showcase', link: '/esp3d/version-21x/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-21x/documentation/' },
                    { label: 'Commands', link: '/esp3d/version-21x/documentation/commands/' },
                    { label: 'API', link: '/esp3d/version-21x/documentation/api/' },
                    { label: 'Notifications', link: '/esp3d/version-21x/documentation/notifications/' },
                    { label: 'SD transfer', link: '/esp3d/version-21x/documentation/sdtransfert/' },
                  ],
                },
              ],
            },
            {
              label: 'ESP3D Version 3.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3d/version-3x/' },
                { label: 'Features', link: '/esp3d/version-3x/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-3x/hardware/' },
                    {
                      label: 'ESP Boards',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/hardware/esp_boards/' },
                        {
                          label: 'ESP32',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32' },
                        },
                        {
                          label: 'ESP8266',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp8266' },
                        },
                        {
                          label: 'ESP8285',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp8285' },
                        },
                        {
                          label: 'ESP32-PICO',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32-pico' },
                        },
                        {
                          label: 'ESP32-C3',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32-c3' },
                        },
                        {
                          label: 'ESP32-C6',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32-c6' },
                        },
                        {
                          label: 'ESP32-S2',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32-s2' },
                        },
                        {
                          label: 'ESP32-S3',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/esp_boards/esp32-s3' },
                        },
                      ],
                    },
                    {
                      label: 'System Boards',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/hardware/system_boards/' },
                        {
                          label: 'Main boards',
                          collapsed: true,
                          autogenerate: { directory: 'ESP3D/version-3x/hardware/system_boards/main_boards' },
                        },
                        {
                          label: 'TFT',
                          collapsed: true,
                          items: [
                            { label: 'Overview', link: '/esp3d/version-3x/hardware/system_boards/tft/' },
                            {
                              label: 'Bigtreetech',
                              collapsed: true,
                              autogenerate: { directory: 'ESP3D/version-3x/hardware/system_boards/tft/bigtreetech' },
                            },
                            {
                              label: 'Makerbase',
                              collapsed: true,
                              autogenerate: { directory: 'ESP3D/version-3x/hardware/system_boards/tft/makerbase' },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  label: 'Installation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-3x/installation/' },
                    { label: 'Arduino IDE', link: '/esp3d/version-3x/installation/arduino/' },
                    { label: 'PlatformIO', link: '/esp3d/version-3x/installation/vscode-platformio/' },
                    { label: 'Configuration', link: '/esp3d/version-3x/installation/configuration/' },
                  ],
                },
                { label: 'Showcase', link: '/esp3d/version-3x/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d/version-3x/documentation/' },
                    { label: 'Commands', link: '/esp3d/version-3x/documentation/commands/' },
                    { label: 'Authentication', link: '/esp3d/version-3x/documentation/authentication/' },
                    {
                      label: 'Notifications',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/documentation/notifications/' },
                        { label: 'Pushover', link: '/esp3d/version-3x/documentation/notifications/pushover/' },
                        { label: '⚠️Line (Discontinued)', link: '/esp3d/version-3x/documentation/notifications/line/' },
                        { label: 'Email & SMTP', link: '/esp3d/version-3x/documentation/notifications/email_and_smtp/' },
                        { label: 'IFTTT', link: '/esp3d/version-3x/documentation/notifications/ifttt/' },
                        { label: 'Telegram', link: '/esp3d/version-3x/documentation/notifications/telegram/' },
                        { label: 'WhatsApp', link: '/esp3d/version-3x/documentation/notifications/whatsapp/' },
                        { label: 'Home Assistant', link: '/esp3d/version-3x/documentation/notifications/home-assistant/' },
                      ],
                    },
                    { label: 'Camera', link: '/esp3d/version-3x/documentation/camera/' },
                    { label: 'Update', link: '/esp3d/version-3x/documentation/update/' },
                    { label: 'SD transfer', link: '/esp3d/version-3x/documentation/sdtransfer/' },
                    { label: 'FTP', link: '/esp3d/version-3x/documentation/ftp/' },
                    { label: 'WebDAV', link: '/esp3d/version-3x/documentation/webdav/' },
                    { label: 'Telnet', link: '/esp3d/version-3x/documentation/telnet/' },
                    { label: 'OTG', link: '/esp3d/version-3x/documentation/otg/' },
                    { label: 'Lua', link: '/esp3d/version-3x/documentation/lua/' },
                    { label: 'Compilation', link: '/esp3d/version-3x/documentation/compilation/' },
                    { label: 'FAQ', link: '/esp3d/version-3x/documentation/faq/' },
                    {
                      label: 'API',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/documentation/api/' },
                        { label: 'Hooks', link: '/esp3d/version-3x/documentation/api/hooks/' },
                        { label: 'Web handlers', link: '/esp3d/version-3x/documentation/api/webhandlers/' },
                        { label: 'Web sockets', link: '/esp3d/version-3x/documentation/api/websockets/' },
                        { label: 'Variables', link: '/esp3d/version-3x/documentation/api/variables/' },
                      ],
                    },
                  ],
                },
                { label: 'Credits', link: '/esp3d/version-3x/credits/' },
              ],
            },

          ],
        },
        {
          label: 'ESP3DLib',
          collapsed: true,
          items: [
            { label: 'What Is ESP3DLib?', link: '/esp3dlib/' },
            {
              label: 'Version 1.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3dlib/version_1x/' },
                { label: 'Credits', link: '/esp3dlib/version_1x/credits/' },
                { label: 'Features', link: '/esp3dlib/version_1x/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3dlib/version_1x/hardware/' },
                    { label: 'ESP32 Controller', link: '/esp3dlib/version_1x/hardware/esp32-controller/' },
                    { label: 'FYSETC-E4', link: '/esp3dlib/version_1x/hardware/fysetc-e4/' },
                    { label: 'MKS Tinybee V1', link: '/esp3dlib/version_1x/hardware/mks-tinybee-v1/' },
                    { label: 'MRR-ESPA', link: '/esp3dlib/version_1x/hardware/mrr-espa/' },
                    { label: 'MRR-ESPE', link: '/esp3dlib/version_1x/hardware/mrr-espe/' },
                    { label: 'Panda Zhu/M4', link: '/esp3dlib/version_1x/hardware/panda-zhu-m4/' },
                  ],
                },
                { label: 'Installation', link: '/esp3dlib/version_1x/installation/' },
                { label: 'Showcase', link: '/esp3dlib/version_1x/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3dlib/version_1x/documentation/' },
                    { label: 'Commands', link: '/esp3dlib/version_1x/documentation/commands/' },
                  ],
                },
              ],
            },
            {
              label: 'Version 3.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3dlib/version_3x/' },
                { label: 'Credits', link: '/esp3dlib/version_3x/credits/' },
                { label: 'Features', link: '/esp3dlib/version_3x/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3dlib/version_3x/hardware/' },
                    { label: 'FYSETC-E4', link: '/esp3dlib/version_3x/hardware/fysetc-e4/' },
                    { label: 'MKS Tinybee V1', link: '/esp3dlib/version_3x/hardware/mks-tinybee-v1/' },
                    { label: 'MRR-ESPA', link: '/esp3dlib/version_3x/hardware/mrr-espa/' },
                    { label: 'MRR-ESPE', link: '/esp3dlib/version_3x/hardware/mrr-espe/' },
                    { label: 'Panda Zhu/M4', link: '/esp3dlib/version_3x/hardware/panda-zhu-m4/' },
                  ],
                },
                { label: 'Installation', link: '/esp3dlib/version_3x/installation/' },
                { label: 'Showcase', link: '/esp3dlib/version_3x/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3dlib/version_3x/documentation/' },
                    { label: 'Commands', link: '/esp3dlib/version_3x/documentation/commands/' },
                    { label: 'Authentication', link: '/esp3dlib/version_3x/documentation/authentication/' },
                    {
                      label: 'Notifications',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3dlib/version_3x/documentation/notifications/' },
                        { label: 'Pushover', link: '/esp3dlib/version_3x/documentation/notifications/pushover/' },
                        { label: '⚠️Line (Discontinued)', link: '/esp3dlib/version_3x/documentation/notifications/line/' },
                        { label: 'Email & SMTP', link: '/esp3dlib/version_3x/documentation/notifications/email_and_smtp/' },
                        { label: 'IFTTT', link: '/esp3dlib/version_3x/documentation/notifications/ifttt/' },
                        { label: 'Telegram', link: '/esp3dlib/version_3x/documentation/notifications/telegram/' },
                        { label: 'Home Assistant', link: '/esp3dlib/version_3x/documentation/notifications/home-assistant/' },
                      ],
                    },
                    { label: 'FTP', link: '/esp3dlib/version_3x/documentation/ftp/' },
                    { label: 'WebDAV', link: '/esp3dlib/version_3x/documentation/webdav/' },
                    { label: 'Update', link: '/esp3dlib/version_3x/documentation/update/' },
                    { label: 'Compilation', link: '/esp3dlib/version_3x/documentation/compilation/' },
                    { label: 'FAQ', link: '/esp3dlib/version_3x/documentation/faq/' },
                    { label: 'API', link: '/esp3dlib/version_3x/documentation/api/' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'ESP3D-TFT',
          collapsed: true,
          items: [
            { label: 'What Is ESP3D-TFT?', link: '/esp3d-tft/' },
            {
              label: 'Version 1.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3d-tft/version_1x/' },
                { label: 'Credits', link: '/esp3d-tft/version_1x/credits/' },
                { label: 'Features', link: '/esp3d-tft/version_1x/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d-tft/version_1x/hardware/' },
                    { label: 'ESP32', link: '/esp3d-tft/version_1x/hardware/esp32/' },
                    { label: 'ESP32-S3', link: '/esp3d-tft/version_1x/hardware/esp32-s3/' },
                  ],
                },
                { label: 'Installation', link: '/esp3d-tft/version_1x/installation/' },
                { label: 'Showcase', link: '/esp3d-tft/version_1x/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d-tft/version_1x/documentation/' },
                    { label: 'Commands', link: '/esp3d-tft/version_1x/documentation/commands/' },
                    { label: 'Authentication', link: '/esp3d-tft/version_1x/documentation/authentication/' },
                    { label: 'Camera', link: '/esp3d-tft/version_1x/documentation/camera/' },
                    { label: 'Notifications', link: '/esp3d-tft/version_1x/documentation/notifications/' },
                    { label: 'FTP', link: '/esp3d-tft/version_1x/documentation/ftp/' },
                    { label: 'WebDAV Service', link: '/esp3d-tft/version_1x/documentation/webdavservice/' },
                    { label: 'Update', link: '/esp3d-tft/version_1x/documentation/update/' },
                    { label: 'Compilation', link: '/esp3d-tft/version_1x/documentation/compilation/' },
                    { label: 'FAQ', link: '/esp3d-tft/version_1x/documentation/faq/' },
                    {
                      label: 'API',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d-tft/version_1x/documentation/api/' },
                        { label: 'Conventions', link: '/esp3d-tft/version_1x/documentation/api/conventions/' },
                        { label: 'Variables', link: '/esp3d-tft/version_1x/documentation/api/variables/' },
                        { label: 'Web Handlers', link: '/esp3d-tft/version_1x/documentation/api/webhandlers/' },
                        { label: 'Web Sockets', link: '/esp3d-tft/version_1x/documentation/api/websockets/' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'ESP3D-WebUI',
          collapsed: true,
          items: [
            { label: 'What Is ESP3D-WebUI?', link: '/esp3d-webui/' },
            {
              label: 'Version 2.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3d-webui/version_2x/' },
                { label: 'Credits', link: '/esp3d-webui/version_2x/credits/' },
                { label: 'Features', link: '/esp3d-webui/version_2x/features/' },
                { label: 'Installation', link: '/esp3d-webui/version_2x/installation/' },
                { label: 'Documentation', link: '/esp3d-webui/version_2x/documentation/' },
                { label: 'Showcase', link: '/esp3d-webui/version_2x/showcase/' },
              ],
            },
            {
              label: 'Version 3.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/esp3d-webui/version_3x/' },
                { label: 'Credits', link: '/esp3d-webui/version_3x/credits/' },
                { label: 'Features', link: '/esp3d-webui/version_3x/features/' },
                { label: 'Installation', link: '/esp3d-webui/version_3x/installation/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d-webui/version_3x/documentation/' },
                    { label: 'Themes', link: '/esp3d-webui/version_3x/documentation/themes/' },
                    { label: 'Polling', link: '/esp3d-webui/version_3x/documentation/polling/' },
                    { label: 'Extensions', link: '/esp3d-webui/version_3x/documentation/extensions/' },
                    { label: 'Camera', link: '/esp3d-webui/version_3x/documentation/camera/' },
                    { label: 'Extra Content', link: '/esp3d-webui/version_3x/documentation/extra/' },
                    { label: 'Macros', link: '/esp3d-webui/version_3x/documentation/macros/' },
                    { label: 'Translation', link: '/esp3d-webui/version_3x/documentation/translation/' },
                    { label: 'Update', link: '/esp3d-webui/version_3x/documentation/update/' },
                    { label: 'Compilation', link: '/esp3d-webui/version_3x/documentation/compilation/' },
                    {
                      label: 'API',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/esp3d-webui/version_3x/documentation/api/' },
                        { label: 'Conventions', link: '/esp3d-webui/version_3x/documentation/api/conventions/' },
                        { label: 'File Upload', link: '/esp3d-webui/version_3x/documentation/api/fileupload/' },
                        { label: 'Real-Time Commands', link: '/esp3d-webui/version_3x/documentation/api/realtimecmd/' },
                        { label: 'Variables List', link: '/esp3d-webui/version_3x/documentation/api/variableslist/' },
                        { label: 'Web Handlers', link: '/esp3d-webui/version_3x/documentation/api/webhandlers/' },
                        { label: 'Web Sockets', link: '/esp3d-webui/version_3x/documentation/api/websockets/' },
                        { label: 'Extensions API', link: '/esp3d-webui/version_3x/documentation/api/extensions/' },
                      ],
                    },
                  ],
                },
                {
                  label: 'Showcase',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/esp3d-webui/version_3x/showcase/' },
                    { label: 'UI', link: '/esp3d-webui/version_3x/showcase/ui/' },
                    { label: 'Themes', link: '/esp3d-webui/version_3x/showcase/themes/' },
                    { label: 'Extensions', link: '/esp3d-webui/version_3x/showcase/extensions/' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Extra Tools',
          collapsed: true,
          items: [
            { label: 'Overview', link: '/tools/' },
            { label: 'SD Tools', link: '/tools/sdtools/' },
            {
              label: 'Discovery Tools',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/tools/discovery/' },
                { label: 'SSDP', link: '/tools/discovery/ssdp/' },
                { label: 'mDNS', link: '/tools/discovery/mdns/' },
              ],
            },
          ],
        },
        { label: 'Sponsoring', link: '/sponsoring/', attrs: { class: 'sidebar-toplink' } },
      ],

      /** MkDocs-style ` ```Text ` fences → Shiki `txt` (avoids EC warnings). */
      expressiveCode: {
        shiki: {
          langAlias: {
            Text: 'txt',
            text: 'txt',
          },
        },
      },

      customCss: [
        './src/styles/custom.css',
      ],

      head: [
        {
          tag: 'script',
          attrs: { defer: true, src: '/sidebar-accordion.js' },
        },
        {
          tag: 'script',
          attrs: { defer: true, src: '/toc-scroll-spy-fix.js' },
        },
        {
          tag: 'script',
          attrs: { defer: true, src: '/image-lightbox.js' },
        },
        {
          tag: 'script',
          attrs: {
            async: true,
            src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-TON_ID_ICI',
            crossorigin: 'anonymous'
          }
        }
      ],

      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/luc-github/esp3d.io',
        },
      ],

      editLink: {
        baseUrl: 'https://github.com/luc-github/esp3d.io/edit/main/esp3d-starlight/'
      }
    })
  ],

  sitemap: true,
});
