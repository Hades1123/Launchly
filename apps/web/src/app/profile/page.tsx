'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { CandidateProfile, CvMetadata } from '@launchly/shared';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Card } from '@/components/ui/card';
import { ProfileForm } from './components/profile-form';
import { CvUploader } from './components/cv-uploader';
import { CvViewer } from './components/cv-viewer';
import { getCandidateProfile } from '@/lib/api/candidate';
import { useAuth } from '@/lib/auth-context';

export default function CandidateProfilePage() {
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReplacingCv, setIsReplacingCv] = useState(false);

  const isCandidate = status === 'authenticated' && user?.role === 'CANDIDATE';

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;

    async function load() {
      try {
        const data = await getCandidateProfile();
        if (active) setProfile(data);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'An unexpected error occurred.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [isCandidate]);

  const handleProfileUpdated = (updated: CandidateProfile) => {
    setProfile(updated);
  };

  const handleCvUploaded = (metadata: CvMetadata) => {
    if (profile) {
      setProfile({
        ...profile,
        cvOriginalFileName: metadata.originalFileName,
        cvUploadedAt: metadata.uploadedAt,
      });
    }
    setIsReplacingCv(false);
  };

  const handleCvDeleted = () => {
    if (profile) {
      setProfile({
        ...profile,
        cvOriginalFileName: null,
        cvUploadedAt: null,
      });
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background pt-28 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Candidate profile & CV
            </h1>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
              Manage your academic background, skills, and resume document so recruiters can
              evaluate your application.
            </p>
          </header>

          {status === 'loading' ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading your session...</p>
            </Card>
          ) : status !== 'authenticated' ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Please{' '}
                <Link
                  href="/login?next=/profile"
                  className="font-semibold text-primary hover:underline"
                >
                  sign in
                </Link>{' '}
                to manage your profile and CV.
              </p>
            </Card>
          ) : !isCandidate ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                The profile and CV page is only available to candidate accounts.
              </p>
            </Card>
          ) : isLoading ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading candidate profile...</p>
            </Card>
          ) : error || !profile ? (
            <Card className="py-12 text-center">
              <div className="rounded-control border border-danger/20 bg-danger-subtle p-6 text-sm text-danger">
                {error || 'Candidate profile not found.'}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Main Column: Basic Profile Information */}
              <section className="lg:col-span-2">
                <Card>
                  <h2 className="mb-4 text-base font-semibold text-foreground">
                    Personal background & competencies
                  </h2>
                  <ProfileForm initialProfile={profile} onProfileUpdated={handleProfileUpdated} />
                </Card>
              </section>

              {/* Sidebar Column: CV Management */}
              <section className="space-y-6 lg:col-span-1">
                <Card>
                  <h2 className="mb-4 text-base font-semibold text-foreground">Resume document</h2>

                  {profile.cvOriginalFileName && !isReplacingCv ? (
                    <CvViewer
                      originalFileName={profile.cvOriginalFileName}
                      uploadedAt={profile.cvUploadedAt || null}
                      onCvDeleted={handleCvDeleted}
                      onStartReplace={() => setIsReplacingCv(true)}
                    />
                  ) : (
                    <CvUploader
                      onCvUploaded={handleCvUploaded}
                      isReplacing={isReplacingCv}
                      onCancelReplace={() => setIsReplacingCv(false)}
                    />
                  )}
                </Card>
              </section>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
