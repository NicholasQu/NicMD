!macro preInit
!macroend

!macro customInstall
  WriteRegStr SHCTX "Software\Classes\*\shell\NicMD" "" "Open with NicMD"
  WriteRegStr SHCTX "Software\Classes\*\shell\NicMD" "Icon" '"$INSTDIR\NicMD.exe"'
  WriteRegStr SHCTX "Software\Classes\*\shell\NicMD\command" "" '"$INSTDIR\NicMD.exe" "%1"'

  WriteRegStr SHCTX "Software\Classes\Directory\shell\NicMD" "" "Open Folder with NicMD"
  WriteRegStr SHCTX "Software\Classes\Directory\shell\NicMD" "Icon" '"$INSTDIR\NicMD.exe"'
  WriteRegStr SHCTX "Software\Classes\Directory\shell\NicMD\command" "" '"$INSTDIR\NicMD.exe" "%1"'

  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\NicMD" "" "Open NicMD Here"
  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\NicMD" "Icon" '"$INSTDIR\NicMD.exe"'
  WriteRegStr SHCTX "Software\Classes\Directory\Background\shell\NicMD\command" "" '"$INSTDIR\NicMD.exe" "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\*\shell\NicMD"
  DeleteRegKey SHCTX "Software\Classes\Directory\shell\NicMD"
  DeleteRegKey SHCTX "Software\Classes\Directory\Background\shell\NicMD"
!macroend

!macro customDirectoryPage
!macroend
