Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

WshShell.CurrentDirectory = FSO.GetParentFolderName(WScript.ScriptFullName)

' Comprobar si ALnova QR ya está funcionando
Set HTTP = CreateObject("MSXML2.XMLHTTP")

On Error Resume Next
HTTP.Open "GET", "http://localhost:3500", False
HTTP.Send

If Err.Number = 0 And HTTP.Status = 200 Then
    ' Ya está funcionando
    WshShell.Run "http://localhost:3500", 1, False
Else
    ' Iniciar ALnova QR en segundo plano
    WshShell.Run "cmd /c npm.cmd start", 0, False

    ' Esperar a que el servidor arranque
    WScript.Sleep 1500

    ' Abrir ALnova QR
    WshShell.Run "http://localhost:3500", 1, False
End If

Set HTTP = Nothing
Set FSO = Nothing
Set WshShell = Nothing