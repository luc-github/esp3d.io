---
description : "Extra Content Documentation"
archetype : "home"
title : "Extra Content"
menuPre : "<i class='fas fa-plus'></i> "
weight : 5
---
## Overview

The ESP3D-WebUI provides a comprehensive set of extra content features that allow users to extend the functionality and customization of the web interface. These features enable users to display a variety of additional information, controls, and specialized interfaces within the application, tailoring the experience to their specific needs.

The extra content can be integrated into the main user interface in two ways: through in-panel rendering on the Dashboard or as a dedicated page. This flexibility allows users to access supplementary content either directly within the current context or on a separate, more expansive view.

The supported types of extra content include HTML content, extension-based content, image content, and ESP32-CAM snapshots. Each type offers unique capabilities and use cases, empowering users to leverage the most appropriate format for their requirements.

## Setting up Extra Content

### Accessing the Setup Extra Content Interface 

* The setup extra content interface can be accessed  through a dedicated "Extra content" panel within the tab Settings/Interface of ESP3D-WebUI.

![image](extra_setting.png?width=400px)

* This panel allows users to view, create, and manage their extra content.

![image](extra_list.png?width=400px)

### Extra Content Visibility and Customization
The extra content can be set to "Show" to control the visibility of the panels and pages. The setting "Visible when starting" only affexct extra content that is displayed on the Dashboard.
This allows users to manage the display extra content based on their preferences and workflow needs.

### Creating a New Extra Content
1. To add a new extra content, click the "Add content" button in the extra content panel interface. It will create a new extra content with default settings.   
![image](extra_sample.png?width=400px)
2. Provide a name for the content and select an icon to represent it.   
![image](extra_icons.png?width=400px)
3. Select the output type of the content, which can be one of the following types: 
   * In-Panel Rendering (Dashboard):
     * Extra content can be displayed directly within a panel of the Dashboard.
     * This is useful for quickly accessing and viewing additional information or functionality without leaving the current context.
   * Dedicated Page:
     * Extra content can also be presented on a separate, dedicated page within the web application.
       This approach is suitable for more complex or extensive extra content that requires a larger display area.   
![image](extra_output.png?width=400px)
4. Define the URL Address where the extra content is located.    
   Be noted that the syntax URL depend on the type of content you want to display.

5. Select the types of Extra Content
   The ESP3D-WebUI supports four main types of extra content:
   * Content:
    This type of extra content is displayed as pure HTML content.
    If the URL does not start with "http", it means the content is stored on the system's flash memory or SD card.
    For content stored on the SD card, the URL should start with "/sd".
   * Extension:
    This type of extra content is also HTML-based, but it utilizes the [extension API](/ESP3D-WebUI/v3.x/documentation/api/extensions/).
    The [extension API](/ESP3D-WebUI/v3.x/documentation/api/extensions/) allows the extra content to inject CSS styles and interact with the main web UI through a  [extension API](/ESP3D-WebUI/v3.x/documentation/api/extensions/).
   * Image:
    This type of extra content can be used to display an image or a snapshot from a remote IP camera.
    The URL can point to a local image file or a remote IP camera feed.
   * ESP32-CAM Snapshot:
    If an ESP32-CAM device is detected, this type of extra content can be used to display a live snapshot from the camera.
    The url will be automatically be set to "/snap".   

![image](extra_type.png?width=400px)

6. For some content you may need to define the refresh rate of the content.
    This is necessary for esp32-cam snapshot and remote IP camera feed.

### Editing an Extra Content
To modify an existing extra content , click on the content button  you wish to update. This will open the configuration interface, where you can make changes to the  name, icon, output, URL, type, and refresh time.    
![image](extra_edit.png?width=400px)

### Deleting an Extra Content
To remove an extra content, click on the "Trash" button next to the extra content you wish to delete.    
![image](extra_delete.png?width=400px)

## Using Extra Content

### Accessing Content from the menu
Each extra content using dedicated page as output will be displayed as a menu item in the menu bar.   
![image](extra_page_menu.png?width=400px)

And selecting the menu item will display the content in a dedicated page.   
![image](extra_page_content.png?width=400px)

### Accessing Content from the Dashboard
Each extra content using panel as output will be displayed as a panel in dashboard.   
![image](extra_panel_content.png?width=400px)


{{% notice style="orange" title="Warning" icon="exclamation" %}}
An extra content act as independent content, so when panel / page is close the connection to the content is closed. A new connection will be open when the panel / page is displayed again.
{{% /notice %}}

## Conclusion
By leveraging the extra content features, users can extend the functionality and capabilities of the ESP3D-WebUI to suit their specific needs. Whether displaying supplementary information, custom controls, or specialized interfaces, the extra content options provide a flexible and extensible platform for enhancing the user experience. The ability to create, edit, and delete extra content on-the-fly empowers users to continuously optimize and personalize their 3D printing workflow within the ESP3D-WebUI.
