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
            { label: 'What is ESP3D ?', link: '/esp3d/' },
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
                      label: 'ESP boards',
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
                      label: 'System boards',
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
            {
              label: 'Version 3.X',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/ESP3DLib/Version_3.X/' },
                { label: 'Credits', link: '/ESP3DLib/Version_3.X/credits/' },
                { label: 'Features', link: '/ESP3DLib/Version_3.X/features/' },
                {
                  label: 'Hardware',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/ESP3DLib/Version_3.X/hardware/' },
                  ],
                },
                { label: 'Installation', link: '/ESP3DLib/Version_3.X/installation/' },
                { label: 'Showcase', link: '/ESP3DLib/Version_3.X/showcase/' },
                {
                  label: 'Documentation',
                  collapsed: true,
                  items: [
                    { label: 'Overview', link: '/ESP3DLib/Version_3.X/documentation/' },
                    { label: 'Commands', link: '/ESP3DLib/Version_3.X/documentation/commands/' },
                    { label: 'Authentication', link: '/ESP3DLib/Version_3.X/documentation/authentication/' },
                    {
                      label: 'Notifications',
                      collapsed: true,
                      items: [
                        { label: 'Overview', link: '/ESP3DLib/Version_3.X/documentation/notifications/' },
                        { label: 'Pushover', link: '/ESP3DLib/Version_3.X/documentation/notifications/pushover/' },
                        { label: 'Line', link: '/ESP3DLib/Version_3.X/documentation/notifications/line/' },
                        { label: 'Email & SMTP', link: '/ESP3DLib/Version_3.X/documentation/notifications/email_and_smtp/' },
                        { label: 'IFTTT', link: '/ESP3DLib/Version_3.X/documentation/notifications/ifttt/' },
                        { label: 'Telegram', link: '/ESP3DLib/Version_3.X/documentation/notifications/telegram/' },
                        { label: 'Home Assistant', link: '/ESP3DLib/Version_3.X/documentation/notifications/home-assistant/' },
                      ],
                    },
                    { label: 'API', link: '/ESP3DLib/Version_3.X/documentation/api/' },
                    { label: 'FTP', link: '/ESP3DLib/Version_3.X/documentation/ftp/' },
                    { label: 'WebDAV', link: '/ESP3DLib/Version_3.X/documentation/webdav/' },
                    { label: 'Update', link: '/ESP3DLib/Version_3.X/documentation/update/' },
                    { label: 'Compilation', link: '/ESP3DLib/Version_3.X/documentation/compilation/' },
                    { label: 'FAQ', link: '/ESP3DLib/Version_3.X/documentation/faq/' },
                  ],
                },
              ],
            },
          ],
        },
        { label: 'ESP3D-TFT', collapsed: true, autogenerate: { directory: 'ESP3D-TFT' } },
        { label: 'ESP3D-WebUI', collapsed: true, autogenerate: { directory: 'ESP3D-WebUI' } },
        { label: 'Tools', collapsed: true, autogenerate: { directory: 'tools' } },
        { label: 'Sponsoring', collapsed: true, autogenerate: { directory: 'sponsoring' } },
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
