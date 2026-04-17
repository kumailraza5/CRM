import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun, Monitor, Save } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Settings saved successfully" });
    }, 600);
  };

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" defaultValue={user?.email} />
            </div>
            <Button onClick={handleSave} disabled={loading} className="mt-2">
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how ClientHunter looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setTheme("light")}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <Sun className="w-6 h-6" />
                <span className="font-medium text-sm">Light</span>
              </button>
              <button 
                onClick={() => setTheme("dark")}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <Moon className="w-6 h-6" />
                <span className="font-medium text-sm">Dark</span>
              </button>
              <button 
                onClick={() => setTheme("system")}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <Monitor className="w-6 h-6" />
                <span className="font-medium text-sm">System</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Control what alerts you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Daily Summary Email</Label>
                <p className="text-sm text-muted-foreground">Receive a morning digest of tasks and follow-ups due.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Lead Activity Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify me when a lead's status changes automatically.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Follow-up Reminders</Label>
                <p className="text-sm text-muted-foreground">Browser notifications for overdue follow-ups.</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
