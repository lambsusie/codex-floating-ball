param([Parameter(Mandatory)][int]$ProcessId, [ValidateSet('Inspect','Show','Close','Deactivate')][string]$Action = 'Inspect')
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PrototypeWindowTest {
    public delegate bool Callback(IntPtr hwnd, IntPtr data);
    [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr data);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, System.Text.StringBuilder text, int length);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wparam, IntPtr lparam);
    public static IntPtr Find(uint pid) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hwnd, unused) => {
            uint owner; GetWindowThreadProcessId(hwnd, out owner);
            var text = new System.Text.StringBuilder(256); GetWindowText(hwnd, text, 256);
            if (owner == pid && text.ToString() == "Codex Floating Ball") { found = hwnd; return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@
$window = [PrototypeWindowTest]::Find([uint32]$ProcessId)
if ($window -eq [IntPtr]::Zero) { throw 'Prototype window not found for supplied PID' }
switch ($Action) {
    'Show' { [void][PrototypeWindowTest]::ShowWindow($window, 4) }
    'Close' { [void][PrototypeWindowTest]::PostMessage($window, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
    'Deactivate' {
        [void][PrototypeWindowTest]::PostMessage($window, 0x0086, [IntPtr]1, [IntPtr]::Zero)
        [void][PrototypeWindowTest]::PostMessage($window, 0x0007, [IntPtr]::Zero, [IntPtr]::Zero)
        [void][PrototypeWindowTest]::PostMessage($window, 0x0086, [IntPtr]::Zero, [IntPtr]::Zero)
    }
}
$style = [PrototypeWindowTest]::GetWindowLongPtr($window, -20).ToInt64()
[ordered]@{ exists=[PrototypeWindowTest]::IsWindow($window); appWindow=($style -band 0x40000) -ne 0; toolWindow=($style -band 0x80) -ne 0; topmost=($style -band 0x8) -ne 0 } | ConvertTo-Json -Compress
