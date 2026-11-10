'use client';

import { useState } from 'react';
import type { CandidateProfile, UpdateCandidateProfileInput } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { updateCandidateProfile } from '@/lib/api/candidate';

interface ProfileFormProps {
  initialProfile: CandidateProfile;
  onProfileUpdated: (updated: CandidateProfile) => void;
}

export function ProfileForm({ initialProfile, onProfileUpdated }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [headline, setHeadline] = useState(initialProfile.headline || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [location, setLocation] = useState(initialProfile.location || '');
  const [schoolMajor, setSchoolMajor] = useState(initialProfile.schoolMajor || '');
  const [skills, setSkills] = useState<string[]>(initialProfile.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [projectsActivities, setProjectsActivities] = useState(
    initialProfile.projectsActivities || '',
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateCandidateProfileInput = {
        fullName: fullName.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        schoolMajor: schoolMajor.trim() || null,
        skills,
        projectsActivities: projectsActivities.trim() || null,
      };

      const updated = await updateCandidateProfile(payload);
      onProfileUpdated(updated);
      setSuccessMessage('Profile saved successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-subtle p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-control border border-success/20 bg-success-subtle p-4 text-sm text-success">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="block text-xs font-semibold text-foreground">
            Full name <span className="text-danger">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. John Doe"
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="headline" className="block text-xs font-semibold text-foreground">
            Professional headline
          </label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Fresher Frontend Developer"
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-xs font-semibold text-foreground">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Ho Chi Minh City, Vietnam"
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="schoolMajor" className="block text-xs font-semibold text-foreground">
            University or major
          </label>
          <input
            id="schoolMajor"
            type="text"
            value={schoolMajor}
            onChange={(e) => setSchoolMajor(e.target.value)}
            placeholder="e.g. Computer Science - HCMUT"
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="block text-xs font-semibold text-foreground">
            Bio summary
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Brief introduction about your technical background and career aspirations..."
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="skillInput" className="block text-xs font-semibold text-foreground">
            Skills & competencies
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="skillInput"
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="e.g. React, TypeScript, Next.js"
              className="block flex-1 rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
            />
            <Button variant="soft" type="button" onClick={handleAddSkill}>
              Add
            </Button>
          </div>

          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  shape="pill"
                  className="flex items-center gap-1.5 bg-secondary px-3 py-1 text-xs text-foreground"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="cursor-pointer text-muted-foreground hover:text-danger focus:outline-none"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X className="size-3" strokeWidth={2} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="projectsActivities"
            className="block text-xs font-semibold text-foreground"
          >
            Key projects and extracurricular activities
          </label>
          <textarea
            id="projectsActivities"
            rows={4}
            value={projectsActivities}
            onChange={(e) => setProjectsActivities(e.target.value)}
            placeholder="Detail personal projects, hackathons, academic achievements, or leadership roles..."
            className="mt-1.5 block w-full rounded-control border border-input bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition-all focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving changes...' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}
