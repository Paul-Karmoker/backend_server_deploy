import  Resume from '../model/Resume.js';

export async function createResume(data) {
  const resume = new Resume({ ...data});
  return await resume.save();
}

  export  async function getResume(userId, resumeId) {
    return await Resume.findOne({ _id: resumeId, user: userId });
  }
  

  export  async function updateResume(userId, resumeId, data) {
    return await Resume.findOneAndUpdate(
      { _id: resumeId, user: userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  export  async function deleteResume(userId, resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    await resume.softDelete();
    return resume;
  }

 export  async function addWorkExperience(userId, resumeId, workExp) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.workExperience.unshift(workExp); // Add to start for chronological order
    return await resume.save();
  }

  export  async function deleteWorkExperience(userId, resumeId, workExpIndex) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.workExperience.splice(workExpIndex, 1);
    return await resume.save();
  }

  export  async function addEducation(userId, resumeId, education) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.education.unshift(education); // Add to start for chronological order
    return await resume.save();
  }

  export  async function deleteEducation(userId, resumeId, educationIndex) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.education.splice(educationIndex, 1);
    return await resume.save();
  }

  export  async function addReference(userId, resumeId, reference) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.references.push(reference);
    return await resume.save();
  }

  export  async function deleteReference(userId, resumeId, referenceIndex) {
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) throw new Error('Resume not found');
    resume.references.splice(referenceIndex, 1);
    return await resume.save();
  }

