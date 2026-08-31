@echo off
cd /d "c:\Users\royri\OneDrive\Desktop\land digi\backend"
"%CD%\.venv313\Scripts\python.exe" test_stage2g.py > stage2g_test_output.txt 2>&1
type stage2g_test_output.txt
