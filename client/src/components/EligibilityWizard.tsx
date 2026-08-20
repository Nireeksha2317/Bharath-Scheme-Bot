import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/hooks/use-profile";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

export function EligibilityWizard({ onComplete }: { onComplete?: () => void }) {
  const { profile, isLoading, updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>(profile || {});

  // Wait for profile to load
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    await updateProfile.mutateAsync(formData);
    setStep(4); // Success step
    if (onComplete) onComplete();
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="text-xl">Your Citizen Profile</CardTitle>
        <CardDescription>
          Help us find schemes you are eligible for by providing some details. 
          Your information is stored securely on your device.
        </CardDescription>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-primary/20'}`} 
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                type="number" 
                placeholder="e.g. 25" 
                value={formData.age || ''} 
                onChange={(e) => handleChange("age", parseInt(e.target.value))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender || ''} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={formData.state || ''} onValueChange={(v) => handleChange("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Karnataka">Karnataka</SelectItem>
                  <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                  {/* We can add more states later */}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium mb-4">Occupation & Education</h3>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Select value={formData.occupation || ''} onValueChange={(v) => handleChange("occupation", v)}>
                <SelectTrigger><SelectValue placeholder="Select Occupation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Farmer">Farmer</SelectItem>
                  <SelectItem value="Salaried">Salaried Employee</SelectItem>
                  <SelectItem value="Business">Business/Self-Employed</SelectItem>
                  <SelectItem value="Unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeRange">Annual Family Income</Label>
              <Select value={formData.incomeRange || ''} onValueChange={(v) => handleChange("incomeRange", v)}>
                <SelectTrigger><SelectValue placeholder="Select Income Range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BPL">Below Poverty Line (BPL)</SelectItem>
                  <SelectItem value="Under 2.5L">Under ₹2.5 Lakhs</SelectItem>
                  <SelectItem value="2.5L - 5L">₹2.5L - ₹5 Lakhs</SelectItem>
                  <SelectItem value="Above 5L">Above ₹5 Lakhs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationLevel">Highest Education Level</Label>
              <Select value={formData.educationLevel || ''} onValueChange={(v) => handleChange("educationLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select Education" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10th">10th Pass or Below</SelectItem>
                  <SelectItem value="12th">12th Pass (PUC)</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                  <SelectItem value="Post-Graduate">Post-Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium mb-4">Additional Details</h3>
            <div className="space-y-2">
              <Label htmlFor="ruralUrban">Area of Residence</Label>
              <Select value={formData.ruralUrban || ''} onValueChange={(v) => handleChange("ruralUrban", v)}>
                <SelectTrigger><SelectValue placeholder="Select Area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rural">Rural</SelectItem>
                  <SelectItem value="Urban">Urban</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disabilityStatus">Disability Status</Label>
              <Select value={formData.disabilityStatus || ''} onValueChange={(v) => handleChange("disabilityStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select Option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Disabled">Differently Abled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8 space-y-4 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-2xl font-bold text-green-700">Profile Saved!</h3>
            <p className="text-muted-foreground">
              We'll now use this information to accurately recommend schemes and check your eligibility.
            </p>
          </div>
        )}
        
        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleBack} disabled={step === 1 || updateProfile.isPending}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
