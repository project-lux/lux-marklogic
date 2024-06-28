## **LUX Backend Local Development Environment**

- [Code and IDE](#code-and-ide)
- [Software for Supported Platforms](#software-for-supported-platforms)
  - [Docker Image](#docker-image)
  - [Manual Install](#manual-install)
- [Apple M1 and M2 Chips](#apple-m1-and-m2-chips)
  - [Rosetta](#rosetta)
  - [Lima](#lima)
- [Setting Up Marklogic Server](#setting-up-marklogic-server)
- [Next Steps](#next-steps)

# Code and IDE

| # | Step | Notes |
| - | ---- | ----- |
| 1 | Clone the LUX Backend repo, and check out the desired branch. | This directory is later referenced as `[clone]`. |
| 2 | Recommended but not required: install [Visual Studio Code](https://code.visualstudio.com/Download) and the [MarkLogic Extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=mlxprs.mlxprs).  In addition to offering syntax highlighting and Intellisense, Visual Studio Code may be used to evaluate code on a MarkLogic server (as an alternative to Query Console), if not also as a debugger. | The project's Visual Studio Code settings are within [/.vscode/settings.json](/.vscode/settings.json). | 

# Software for Supported Platforms

This documentation is geared towards supported operating systems and processors.  If attempting to install MarkLogic on Apple's M1 or M2 chip, please refer to [Apple M1 and M2 Chips](#apple-m1-and-m2-chips).

## Docker Image

A 2021 update to the Docker subscription service agreement may require a paid subscription.  The associated grace period is scheduled to end January 31, 2022.  Please review Docker's [current subscription service agreement](https://www.docker.com/legal/docker-subscription-service-agreement) to determine if this applies to you.

| # | Step | Notes |
| - | ---- | ----- |
| 1 | Create the MarkLogic data directory, outside of source control's purview. | This directory is later referenced as `[ml-data]`.  This directory will allow one to replace the Docker container without losing the MarkLogic databases. |
| 2 | Create or identify an existing temp directory. | This directory is later referenced as `[tmp]`.  Once the Docker container is created, this directory may be used to transfer files between the host operating system and the Docker container. |
| 3 | Install Docker | Download for Windows or Mac from https://www.docker.com/products/docker-desktop. |
| 4 | If you don't already have a Docker ID account, [sign up](https://hub.docker.com/signup) for one.| The sign up link is https://hub.docker.com/signup. |
| 5 |  MarkLogic's Docker page link is https://hub.docker.com/r/marklogicdb/marklogic-db. Make sure you have met any prerequisites listed on that page. |
| 6 | Pull the Docker image you would like to start with --ideally the version matching the DEV environment. | `docker pull marklogicdb/marklogic-db:11.2.0-centos` |
| 7 | Create a container from the image. The example command also initializes MarkLogic and names the container "lux". See [LUX MarkLogic Application Servers](/docs/lux-backend-deployment.md#lux-marklogic-application-servers) if you would like to be more restrictive on the container's exposed ports. | `docker run -d -it -p 8000-8010:8000-8010 --name=lux -v [ml-data]:/var/opt/MarkLogic -v [clone]:/host/code -v [tmp]:/host/tmp -e MARKLOGIC_INIT=true -e MARKLOGIC_ADMIN_USERNAME=admin -e MARKLOGIC_ADMIN_PASSWORD=admin marklogicdb/marklogic-db:11.2.0-centos` |
| 8 | Open up http://localhost:8001 to verify MarkLogic is running. | |

## Manual Install

If you would prefer to install MarkLogic manually, please create your [MarkLogic Community user account](https://server.marklogic.com/people/signup), download from https://server.marklogic.com/downloads, and follow the directions within MarkLogic's [Installation Guide for All Platforms](https://docs.marklogic.com/guide/installation).

# Apple M1 and M2 Chips

While MarkLogic does not yet support running on the M1 or M2 chips, some have pulled it off using [Rosetta](https://en.wikipedia.org/wiki/Rosetta_(software)) (binary translator, allows running Marklogic installed directly on Mac) and [Lima](https://github.com/lima-vm/lima) (utility which allows running conatiners built for Intel chips on Apple Silicon).

So far at Yale, we've only been successful using Rosetta rather than Lima

 While one may expect MLCP to run 10x to 20x slower than running directly on the Mac via Lima, it offers the advantage of supporting containers, and thus multiple installations of MarkLogic.

## Rosetta
Rosetta is a dynamic binary translator, it translates Intel processor instructions to Apple silicon instructions.

To use Rosetta to run Marklogic:

1. Execute the following command to install
    
    `softwareupdate --install-rosetta`

2. Install a MarkLogic 11+ from a .dmg, and follow the normal Marklogic install instructions

## Lima

[Lima](https://github.com/lima-vm/lima) is a utility that can launch Linux VMs on your Mac. It uses [QEMU](https://www.qemu.org/) under the covers (as does Docker desktop). 

In order to run MarkLogic in a container on your M1, you need a Linux VM (you also need this when running containers on Intel Macs). Lima provides a "fast" and a "slow" option https://github.com/lima-vm/lima/blob/master/docs/multi-arch.md.

The "fast" option runs an ARM Linux VM (so native(ish) to M1) and uses QEMU emulate x86 for containers. It looks like this is what Docker desktop does. This mode is not as compatible and we get segfaults from MarkLogic so it is not an option for now.

The "slow" option runs an x86 Linux VM (so in Rosetta emulation on the M1). Using this option, MarkLogic runs without segfaults but the performance is slower than if you just run MarkLogic directly under Rosetta emulation. Follow the instructions below to run in "slow" (but stable) mode.


1. Install Lima. See https://github.com/lima-vm/lima for instructions.

    `brew install lima`

2. Run a VM with the default configuration. See https://github.com/lima-vm/lima/blob/master/examples/default.yaml for all settings.

    `limactl start`

3. When prompted, use the down arrow to select the option to open an editor to edit the configuration. This will open the config yaml in vi. Make the following changes:

    ```
    arch: "x86_64"
    mem: "8GiB"
    ```

    The CPUs default to 4 so you can also up that if you want.

    Save and exit (esc, w, q, enter) and the VM will start.

4. You can connect to the VM to see the OS settings, etc.

    `lima`

    Type "exit" to exit the VM shell.

5. After updating the location of the image, run a MarkLogic container from the mac command line:

    ```
    lima nerdctl run -it -p 8000-8010:8000-8010 \
        --name lux \
        -e MARKLOGIC_INIT=true \
        -e MARKLOGIC_ADMIN_USERNAME=admin \
        -e MARKLOGIC_ADMIN_PASSWORD=admin \
        marklogicdb/marklogic-db:latest
    ```
# Setting Up Marklogic Server
Use the following steps to set up your local Marklogic server for use:
 1. Start up your local Marklogic server (whether it be through docker or host OS installation)
 2. Visit `localhost:8001`
 3. There may be a welcome page when you first open Marklogic. You can skip or click through this page
 4. Set your admin username and password, remember your credentials or store them somewhere safe
 5. Set your wallet password, remember your credentials or store them somewhere safe
 6. Continue with the next steps below

# Next Steps

Head on over to LUX's backend deployment documentation, starting with the [Dependencies and Prerequisites](/docs/lux-backend-deployment.md#dependencies-and-prerequisites).


