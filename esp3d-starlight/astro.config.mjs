import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMermaid from 'remark-mermaid';

export default defineConfig({
  site: 'https://esp3d.io',
  base: '/',

  markdown: {
    remarkPlugins: [[remarkMermaid, { simple: true }]],
  },

  integrations: [
    starlight({
      title: 'ESP3D Ecosystem',
      description: 'Official documentation of the ESP3D Ecosystem',
      logo: {
        src: './src/assets/logo.png',
        alt: 'ESP3D Logo',
        replacesTitle: true,
      },

      sidebar: [
        { label: 'Home', link: '/' },
        {
          label: 'ESP3D',
          items: [
            { label: 'What is ESP3D ?', link: '/esp3d/' },
            {
              label: 'ESP3D Version 2.1.X',
              items: [
                { label: 'Overview', link: '/esp3d/version-21x/' },
                { label: 'Credits', link: '/esp3d/version-21x/credits/' },
                { label: 'Features', link: '/esp3d/version-21x/features/' },
                {
                  label: 'Hardware',
                  items: [
                    { label: 'Overview', link: '/esp3d/version-21x/hardware/' },
                    {
                      label: 'ESP Boards',
                      items: [
                        { label: 'ESP32', link: '/esp3d/version-21x/hardware/esp_boards/esp32/' },
                        { label: 'ESP8266', link: '/esp3d/version-21x/hardware/esp_boards/esp8266/' },
                        { label: 'ESP8285', link: '/esp3d/version-21x/hardware/esp_boards/esp8285/' },
                      ],
                    },
                    {
                      label: 'System Boards',
                      items: [
                        { label: 'Main boards', link: '/esp3d/version-21x/hardware/system_boards/main_boards/' },
                        { label: 'TFT', link: '/esp3d/version-21x/hardware/system_boards/tft/' },
                      ],
                    },
                  ],
                },
                {
                  label: 'Installation',
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
              items: [
                { label: 'Overview', link: '/esp3d/version-3x/' },
                { label: 'Features', link: '/esp3d/version-3x/features/' },
                {
                  label: 'Hardware',
                  items: [
                    { label: 'Overview', link: '/esp3d/version-3x/hardware/' },
                    {
                      label: 'ESP boards',
                      items: [
                        { label: 'ESP32', link: '/esp3d/version-3x/hardware/esp_boards/esp32/' },
                        { label: 'ESP8266', link: '/esp3d/version-3x/hardware/esp_boards/esp8266/' },
                        { label: 'ESP8285', link: '/esp3d/version-3x/hardware/esp_boards/esp8285/' },
                        { label: 'ESP32-PICO', link: '/esp3d/version-3x/hardware/esp_boards/esp32-pico/' },
                        { label: 'ESP32-C3', link: '/esp3d/version-3x/hardware/esp_boards/esp32-c3/' },
                        { label: 'ESP32-C6', link: '/esp3d/version-3x/hardware/esp_boards/esp32-c6/' },
                        { label: 'ESP32-S2', link: '/esp3d/version-3x/hardware/esp_boards/esp32-s2/' },
                        { label: 'ESP32-S3', link: '/esp3d/version-3x/hardware/esp_boards/esp32-s3/' },
                      ],
                    },
                    {
                      label: 'System boards',
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/hardware/system_boards/' },
                        { label: 'Main boards', link: '/esp3d/version-3x/hardware/system_boards/main_boards/' },
                        { label: 'TFT', link: '/esp3d/version-3x/hardware/system_boards/tft/' },
                      ],
                    },
                  ],
                },
                {
                  label: 'Installation',
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
                  items: [
                    { label: 'Overview', link: '/esp3d/version-3x/documentation/' },
                    { label: 'Commands', link: '/esp3d/version-3x/documentation/commands/' },
                    { label: 'Authentication', link: '/esp3d/version-3x/documentation/authentication/' },
                    {
                      label: 'Notifications',
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/documentation/notifications/' },
                        { label: 'Pushover', link: '/esp3d/version-3x/documentation/notifications/pushover/' },
                        { label: 'Line', link: '/esp3d/version-3x/documentation/notifications/line/' },
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
                      items: [
                        { label: 'Overview', link: '/esp3d/version-3x/documentation/api/' },
                        { label: 'Web handlers', link: '/esp3d/version-3x/documentation/api/webhandlers/' },
                        { label: 'Web sockets', link: '/esp3d/version-3x/documentation/api/websockets/' },
                        { label: 'Variables', link: '/esp3d/version-3x/documentation/api/variables/' },
                        { label: 'Hooks', link: '/esp3d/version-3x/documentation/api/hooks/' },
                      ],
                    },
                  ],
                },
                { label: 'Credits', link: '/esp3d/version-3x/credits/' },
              ],
            },

          ],
        },
        { label: 'ESP3DLib',    autogenerate: { directory: 'ESP3DLib' } },
        { label: 'ESP3D-TFT',   autogenerate: { directory: 'ESP3D-TFT' } },
        { label: 'ESP3D-WebUI', autogenerate: { directory: 'ESP3D-WebUI' } },
        { label: 'Tools',       autogenerate: { directory: 'tools' } },
        { label: 'Sponsoring',  autogenerate: { directory: 'sponsoring' } },
      ],

      customCss: [
        './src/styles/custom.css',
      ],

      head: [
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
