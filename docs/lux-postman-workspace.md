## **LUX Postman Workspace**

Collections of requests and LUX environments are available within this repo's [/postman](/postman) directory.  After installing [Postman](https://www.postman.com/downloads/) and creating a workspace, one may import a collection of LUX-related requests: [LUX Postman Collection of Requests](/postman/lux-postman-collection-of-requests.json), at which point something similar to the following will be loaded:

![Postman workspace requests](/docs/img/postman-workspace-requests.png)

Before being able to use them, one or more environments need to be configured.  [lux-postman-environment-local.json](/postman/lux-postman-environment-local.json) defines all the variables the folders and requests reference.  After importing it, override values as necessary in the `Current value` column.  Sensitive information should only be entered in that column.  Once configured:

* Set the environment as the current environment and try a few requests.
* Copy and configure for secondary environments.
