+++
description = "File upload parameters"
archetype = "section"
title = "File upload"
weight = 5
+++

The file upload is done using a multipart form data POST request.
```
------WebKitFormBoundaryYz6fcTCJfjQG8Wp6
Content-Disposition: form-data; name="path"

/
------WebKitFormBoundaryYz6fcTCJfjQG8Wp6
Content-Disposition: form-data; name="/8822552.jpgS"

3308
------WebKitFormBoundaryYz6fcTCJfjQG8Wp6
Content-Disposition: form-data; name="/8822552.jpgT"

2022-08-24T20:17:30
------WebKitFormBoundaryYz6fcTCJfjQG8Wp6
Content-Disposition: form-data; name="myfiles"; filename="/8822552.jpg"
Content-Type: image/jpeg


------WebKitFormBoundaryYz6fcTCJfjQG8Wp6--
```

All parameters are sent before the file data itself.

For each file:

#### The path parameter (required)
The path parameter is the path where the file will be uploaded. It is an absolute path starting from the root of the filesystem and do not contain the filename.

#### The file size parameter (optional but recommended)
The file size parameter is the size of the file to upload. It is used to check if the file can be uploaded and is used to check if the file is fully uploaded.
The argument name is the full file path with filename with a `S` suffix.
The value is the size of the file in bytes.

#### The file time parameter (optional)
The file time parameter is the last modified time of the file to upload. It is optional but allow to set right time on file on ESP that has not time synchronization.
The argument name is the full file path with filename with a `T` suffix.
The value format is ISO 8601 (YYYY-MM-DDThh:mm:ss) without timezone.

#### The file data binary (required)
The file data binary is the file data itself. It is the last parameter of the multipart form data POST request, and it also contains the full file name.