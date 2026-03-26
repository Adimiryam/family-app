#!/bin/bash
# Auto-push script — רץ כשיש commit חדש
cd /Users/adibendavid/family-app
git push origin main >> /tmp/family-app-autopush.log 2>&1
