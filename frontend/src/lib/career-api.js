import { careerJobs as fallbackCareerJobs, getCareerJob as getFallbackCareerJob } from '@/data/careerJobs';

const backend = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function getPublishedCareerJobs() {
  try {
    const response = await fetch(`${backend}/api/career-jobs`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Career jobs API returned ${response.status}`);
    const jobs = await response.json();
    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.error('[careers] using local fallback:', error.message);
    return fallbackCareerJobs;
  }
}

export async function getPublishedCareerJob(slug) {
  if (!slug) return null;
  try {
    const response = await fetch(`${backend}/api/career-jobs/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Career job API returned ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('[careers] using local job fallback:', error.message);
    return getFallbackCareerJob(slug) || null;
  }
}
