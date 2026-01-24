import { SERVER_URL } from '../constants';
import { Skill, SkillsResponse } from '../types';

/**
 * Get all available skills
 */
export async function getSkills(userId?: string): Promise<SkillsResponse> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);

  const url = params.toString()
    ? `${SERVER_URL}/api/skills?${params}`
    : `${SERVER_URL}/api/skills`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get a single skill by ID (includes full content)
 */
export async function getSkill(skillId: string, userId?: string): Promise<Skill> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);

  const url = params.toString()
    ? `${SERVER_URL}/api/skills/${skillId}?${params}`
    : `${SERVER_URL}/api/skills/${skillId}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Skill not found');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.skill;
}

/**
 * Get skill content for preview
 */
export async function getSkillContent(skillId: string, userId?: string): Promise<{
  id: string;
  name: string;
  content: string;
}> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);

  const url = params.toString()
    ? `${SERVER_URL}/api/skills/${skillId}/content?${params}`
    : `${SERVER_URL}/api/skills/${skillId}/content`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Create a new skill
 */
export async function createSkill(skillData: {
  id: string;
  name: string;
  description?: string;
  triggers?: string[];
  version?: string;
  author?: string;
  content: string;
}): Promise<Skill> {
  const response = await fetch(`${SERVER_URL}/api/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(skillData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.skill;
}

/**
 * Delete a user skill
 */
export async function deleteSkill(skillId: string): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/skills/${skillId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
}

export default {
  getSkills,
  getSkill,
  getSkillContent,
  createSkill,
  deleteSkill
};
