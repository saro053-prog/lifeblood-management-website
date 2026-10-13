@echo off
title LifeBlood - Smart Blood Management System
color 0C
echo ==========================================================
echo    LifeBlood - Smart Blood Management System
echo    Enterprise Healthcare Transfusion Network
echo    Author: V. Saravanapandi
echo ==========================================================
echo.
echo Starting backend server on http://localhost:5000 ...
start "" http://localhost:5000
node server/server.js
pause
