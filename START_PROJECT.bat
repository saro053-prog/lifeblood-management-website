@echo off
title LifeBlood - Smart Blood Management System
color 0C
echo ==========================================================
echo    LifeBlood - Smart Blood Management System
echo    B.Sc. Computer Science Final Year Project
echo    Author: V. SARAVANAPANDI (Reg No: C3S40228)
echo ==========================================================
echo.
echo Starting backend server on http://localhost:5000 ...
start "" http://localhost:5000
node server/server.js
pause
