# PrintManager
This app is the new lab organizer for the Purdue 3D Printing Club (3DPC). To see how to use the app, see the video [here](https://www.linkedin.com/posts/andrewtho5942_after-improving-on-a-homework-assignment-activity-7262506305259487233-NDZ4/)

## General Notes
- The organizer will automatically email members when their print is done, assuming it is turned on and they entered the right address. This now uses the club's official print3d@purdue.edu email to not go to spam. This is done with a service account on microsoft azure's graph API, which I had to get ITAP permission to enable automatic emailing from. The main thing to keep in mind with this is that the certificate will expire in about 2 years, so if the emailing just randomly stops working, then this is probably why.

## Technical Instructions
Instruction manual on how to use, maintain, and develop the lab organizer.

## Table of Contents
- [How to change print submission forms](#how-to-change-print-sumbission-forms)
- [How to update the lab's filament stock and alert threshold](#how-to-update-the-labs-filament-stock-and-alert-threshold)
- [How to connect to the lab's tailnet](#how-to-connect-to-the-labs-tailnet)
- [How to access the organizer data remotely](#how-to-access-the-organizer-data-remotely)
- [How to ssh into the lab pc](#how-to-ssh-into-the-lab-pc)
- [How to change the admin password](#how-to-change-the-admin-password)
- [How to edit/restart startup scripts (frontend and backend)](#how-to-editrestart-startup-scripts-frontend-and-backend)
- [How to update the organizer on the lab pc](#how-to-update-the-organizer-on-the-lab-pc)
- [How to set up a local development environment](#how-to-set-up-a-local-development-environment)
- [How to add and remove printers (or otherwise directly edit the database)](#how-to-add-and-remove-printers-or-otherwise-directly-edit-the-database)

  
<br/><br/>
### How to change print submission forms
The organizer connects to print the print submission google forms to retrieve recent form submissions so it can autofill data. If we get a new form, then this will need to be updated to still work. The main idea is that you need to add the app script to the google sheets submissions and then update the link in the organizer's code. Here's how to do it:
- First, open the google sheet for the new form.
- Click on extensions > apps script and copy and paste the contents of [form_submissions_app_script.gs](https://github.com/Purdue-3D-Printing-Club/PrintManager/blob/main/form_submission_app_script.gs) into this window.
- Then, click the blue 'Deploy' button, click new deployment, make sure it is of type 'web app', and set "who has access" to "anyone. Then click Deploy, and copy the URL.
- You will need to update the link to the app script in the organizer by going to line 20 / 21 and replacing the apps script urls assigned to SPECIAL_FILAMENT_APP_SCRIPT_URL or MAIN_APP_SCRIPT_URL.
- Lastly, make sure you update the organizer on the lab pc. See "How to update the organizer on the lab pc" to do this.

<br/><br/>
### How to update the lab's filament stock and alert threshold
The organizer will track the lab's current filament stock as prints are submitted. When this stock crosses below the threshold, an automatic alert email will be sent to the club outlook email (print3d@purdue.edu). Please update the filament stock when new filament arrives. You can also adjust the alert threshold as needed. Here's how to do it:
1. First, open the settings with 's' or by clicking the gear icon and sign in as admin. The admin password is in officer secrets.
2. Next, you should see admin-only settings appear. In this menu, you can click either of the "edit" buttons, enter the new value in the input box, and then click "save" to save the new value. Thats it!

<br/><br/>
### How to connect to the lab's tailnet
The lab pc has a program called tailscale installed on it, which essentially creates a private vpn for devices on the purdue3dpc@gmail.com tailnet, which is just a network of devices with access to the vpn. This allows us to connect to the lab pc from anywhere. Here's how to do it:
1. First, download and install tailscale from [here](https://tailscale.com/download). Then, run tailscale and open the menu by opening the collapseable menu in the bottom right for windows (the application doesn't have an actual GUI, just this small config menu and the dashboard on their website).
2. In this menu, you can add this device to the tailnet by signing in with the purdue3dpc@gmail.com credentials. Then, you just need to connect to the tailnet and you can get access to the lab's LAN remotely.

<br/><br/>
### How to access the organizer data remotely
1. First, connect to tailnet as described in "How to connect to the lab's tailnet".
2. Now that you are connected, go to http://100.91.186.68:3000/ ( you can copy the lab pc's ip address by opening the tailnet menu and going to network-devices > my devices > the-3dpc-pc. Then paste it into a browser with :3000 after).
3. Once here, go to settings, sign in as an admin, and in the admin-only settings, you need to set the server URL to http://100.91.186.68:3001 and the organizer should now be filled with the lab's data.

<br/><br/>
### How to ssh into the lab pc
1. Connect to the lab's tailnet as described in "How to connect to the lab's tailnet".
2. If you want to connect as a supervisor, run `ssh "3DPC Supervisor@the-3dpc-pc"` in a terminal, then enter the supervisor password, which is just 'supervisor'.

 
<br/><br/>
### How to change the admin password

1. Open the organizer and open the settings (top left)
2. Right click, then go to 'inspect' and then go to the 'console' tab
3. Enter your new password in the password field, then click login.
4. Look for the hash text after 'given pswd: ' in the console. Copy this text. 
<img width="1050" alt="pm_1_annotated" src="https://github.com/user-attachments/assets/07642c8d-32ec-4c07-b337-71801fe123f0">

5. Now open VSCode (Look for blue "Visual Studio Code" Icon on desktop)
6. Navigate to the .env file in the client folder (Important: Not the server one!).
7. Replace the text after 'REACT_APP_ADMIN_PSWD=' with the hash that you just copied.
8. Restart the app by either restarting the lab computer or restarting the tasks (detailed in the 'how to edit/restart startup scripts' section)
<img width="1050" alt="pm_2" src="https://github.com/user-attachments/assets/1ec586e9-b677-403f-ac23-23199b763e57">

<br/><br/>
### How to edit/restart startup scripts (frontend and backend)
The app runs locally on the lab computer, so whenever this computer restarts, the code must start running again automatically. That is what these startup scripts do. First, find the location of the scripts. On the lab computer, they are in the PrintManager folder in Documents. If this is your own machine, you will have to copy them down, but you probably won't need to test these scripts on your own machine anyways.

If you want to change the database schema, you cannot do this while the server is running. You have to stop the server through the following steps, change the schema, and start it back up after.

1. To restart the scripts, you need to open task scheduler. Do this by opening the start menu, typing 'Task scheduler', and clicking on it.
2. In the window at the top, scroll down until you see two adjacent tasks called 'start printmanager frontend' and 'start printmanager backend' respectively.
3. Once you find the tasks, you can start or end them by just right clicking on it and selecting 'run' or 'end'.

<br/><br/>
### How to update the organizer on the lab pc
Coming soon!

<br/><br/>
### How to set up a local development environment
 Notice: this is a longer one that will get involved. If you have questions, DM me (Andrew Thompson) on discord and I will be happy to help you get it set up.

- First, lets install mySQL installer, mySQL workbench, and mySQL server.
1. Download and install mySQL installer from here: https://dev.mysql.com/downloads/installer/
2. Open it when finished, and click full. Follow all of the defaults in these prompts, clicking next, execute, and entering/checking your root password where necessary. Make sure to use 'rootpassword' as your password for this, or otherwise you will have to change line 14 in server/index.js to your password.

- Now that you have everything installed, lets set up the database. Open MySQL Workbench and click LocalHost. 
3. Download the PrintManager database schema here: https://drive.google.com/drive/folders/1y4Fg4hmSwGBQUMXmDUKjBaMxczGM3gxY?usp=drive_link
4. extract the dump folder
5. Go to Server > Data Import
6. Import From Dump Project Folder (select the extracted dump folder you just downloaded).
7. You should see a schema called "printmanagerdb2" load in, and in the bottom right you need to click 'Start Import'.
8. Restart MySQL Workbench, and now on the left you should see the printmanagerdb2 scehma. This means it worked. Optionally, you can open the schema, go to tables, and right click on the tables and click 'Select rows - limit 1000' to view the contents of each table. There should be some printers already available in the printer table, but nothing in the printjob table.
<img width="1050" alt="pm_5" src="https://github.com/user-attachments/assets/00893db6-02fe-4626-9a15-45438337a0a4">

- After you are done with this, the database should be all ready to go! Now lets set up VSCode.
1. If you don't already have them, download and install [git](https://git-scm.com/downloads/win) and [vscode](https://code.visualstudio.com/download).
2. (Optional, but highly recommended) install the github pull requests extension by going to the extensions tab, searching for github, and clicking 'install.
![pm_6](https://github.com/user-attachments/assets/5363c5f8-56ad-4040-99ec-29064756fd41)

3. Clone(download) this github repo by clicking the green code button, and download zip.
4. Extract the zip, and open the extracted code by going to VSCode > File > Open Folder (then select the folder)
5. Now we need to download and install node by going [here](https://nodejs.org/en), opening the executable, and following the default prompts. Make sure you copy/remember the folder path where your node is installed. Node is what the app runs on, and npm is the package manager that makes it easy to use what other people already wrote (packages).
6. Once this is done, add node to your system's PATH environment variable. This basically tells your system where to look for it. Do this by searching for "environment variable" in the start menu, and clicking on "edit the system environment variables". In the new window, find where it says "Path" in System Variables and click edit with it selected. Then, click "new" and enter the path to nodejs, which is in the directory from the last step. You can click ok on all windows now, and npm should work in your local VSCode repository.
<img width="1050" alt="pm_7" src="https://github.com/user-attachments/assets/a4ac65cd-3714-40c4-8b7a-d5d2160cf046">

7. Now that nodejs is installed and configured, go back to vscode, and open the terminal at the bottom, you will probably have to drag it up.
8. Next, run 'cd client' and 'npm install'. This will install the necessary packages used by the client. Then do the same for the server: 'cd ../server' and 'npm install'. The npm install command may take a while so just let it run.
9. Now lets set up the environment variables for the app. Go to the file explorer at the top left, then right click the client folder and click 'New file...'. Then name it '.env'. Do the same for the server.
10. In each of these .env files, you have to add the environment variables that the app needs, but I can't post those here, as they are private. If you need these files, please dm me on discord (Andrew Thompson), and I can send you them.
11. Finally, you need to open a second terminal in VSCode by clicking the plus sign at the bottom right and dragging one of the windows to the right side of the terminal to get a split screen view.
13. In the right terminal, cd to the server and run 'node index.js'.
14. 12. In the left terminal, cd to the client folder and run 'npm start'.
15. A browser should open running printManager.
16. Congrats for making it this far, everything should be working now! There may be more setup needed to enable git for this repository, like signing in and linking it to the remote one, but there are plenty of tutorials online for that and you can also message me if for help if needed.
![pm_8](https://github.com/user-attachments/assets/4731622b-eab0-49c8-9022-3eb6aa7269dc)

<br/><br/>
### How to add and remove printers (or otherwise directly edit the database)

1. Assuming you've already installed mySQL workbench from the tutorial above, you can directly edit the database by opening the printer or printjob table, right clicking, and clicking 'Select Rows - limit 1000'.
2. Next, in the table that appears, you can directly modify the values by clicking a cell and typing a new value. You can also delete a row by clicking the farthest left column and pressing delete.
3. When you are done making changes, click apply in the bottom right corner.
![pm_9](https://github.com/user-attachments/assets/a3b81743-a95c-4fb5-a9b1-e78f8f37574b)
