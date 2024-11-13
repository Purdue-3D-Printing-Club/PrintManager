# PrintManager
This app is the new lab organizer for the Purdue 3D Printing Club (3DPC). To see how to use the app, see the video here: https://www.linkedin.com/posts/andrewtho5942_after-improving-on-a-homework-assignment-activity-7262506305259487233-NDZ4/.

Below are some technical instructions:

# How to change the admin password

1. Open the organizer and open the settings (top left)
2. Right click, then go to 'inspect' and then go to the 'console' tab
3. Enter your new password in the password field, then click login.
4. Look for the hash text after 'given pswd: ' in the console. Copy this text. 
<img width="770" alt="pm_1_annotated" src="https://github.com/user-attachments/assets/07642c8d-32ec-4c07-b337-71801fe123f0">

5. Now open VSCode (Look for blue "Visual Studio Code" Icon on desktop)
6. Navigate to the .env file in the client folder (Important: Not the server one!).
7. Replace the text after 'REACT_APP_ADMIN_PSWD=' with the hash that you just copied.
8. Restart the app by either restarting the lab computer or restarting the tasks (detailed in the 'how to edit/restart startup scripts' section)
<img width="794" alt="pm_2" src="https://github.com/user-attachments/assets/1ec586e9-b677-403f-ac23-23199b763e57">


# How to set up a local development environment
 Notice: this is a longer one that will get involved. If you have questions, DM me (Andrew Thompson) on discord and I will be happy to help you get it set up.

- First, lets install mySQL installer, mySQL workbench, and mySQL server.
1. Download and install mySQL installer from here: https://dev.mysql.com/downloads/installer/
2. Open it when finished, and click 'add'. Then navigate to Applications > MySQLWorkbench > MYSQLWorkbench 8.0 > MYSQLWorkbench 8.0.40 - X64.
3. Click the green right arrow.
4. Click next at the bottom right.
<img width="572" alt="pm_3" src="https://github.com/user-attachments/assets/e25c77b5-4342-4bb9-b4ee-718fffd3c7b8">

5. After this, click 'Execute', then click 'Next', then click 'Execute' again, then click 'Next' again. This will download and install the software.
7. Finish this installation, and now lets also install mySQL server.
8. Click 'add' again, then navigate to MySQL Servers > MySQL Server > MySQL Server 8.0 > MySQL Server 8.0.40 - X64.
9. Click the green right arrow.
10. Click next.
<img width="575" alt="pm_4" src="https://github.com/user-attachments/assets/b27ecdbb-bf5a-486d-a0c3-bd4389e01abe">
11. repeat step 5: 'Execute' -> 'Next' -> 'Execute' -> 'Next'
12. Now we need to configure SQL Server: Use all of the defaults for these and enter your admin password when prompted. Then click execute to install MySQL Server. This may take a little while so wait for it to finish.
13. 


# How to add and remove printers (or directly edit the database in other ways)

# How to edit/restart startup scripts (frontend and backend)
