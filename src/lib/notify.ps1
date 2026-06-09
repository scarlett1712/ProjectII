param (
    [string]$Title,
    [string]$Message
)

try {
    # Load Windows Runtime types
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $ToastXml = [xml]$Template.GetXml()
    
    $null = $ToastXml.GetElementsByTagName('text')[0].AppendChild($ToastXml.CreateTextNode($Title))
    $null = $ToastXml.GetElementsByTagName('text')[1].AppendChild($ToastXml.CreateTextNode($Message))
    
    $Xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $Xml.LoadXml($ToastXml.OuterXml)
    
    $Toast = New-Object Windows.UI.Notifications.ToastNotification $Xml
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Star AI').Show($Toast)
} catch {
    # Fallback to older balloon tip
    [void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
    $objNotifyIcon = New-Object System.Windows.Forms.NotifyIcon
    $objNotifyIcon.Icon = [System.Drawing.SystemIcons]::Information
    $objNotifyIcon.BalloonTipIcon = "Info"
    $objNotifyIcon.BalloonTipText = $Message
    $objNotifyIcon.BalloonTipTitle = $Title
    $objNotifyIcon.Visible = $True
    $objNotifyIcon.ShowBalloonTip(10000)
    Start-Sleep -Seconds 2
    $objNotifyIcon.Dispose()
}
