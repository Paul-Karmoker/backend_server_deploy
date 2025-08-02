import mongoose, { Schema } from 'mongoose';

const addSoftDelete = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  schema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
  });

  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    await this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    await this.save();
  };
};

// Sub-schemas
const AddressSchema = new Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  postal: { type: String, trim: true },
  country: { type: String, trim: true },
}, { _id: false });

const WorkExperienceSchema = new Schema({
  companyName: { type: String, trim: true, required: true },
  position: { type: String, trim: true, required: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  from: { type: Date, required: true },
  to: { type: Date },
  currentlyWorking: { type: Boolean, default: false },
  description: [{ type: String, trim: true }],
}, { _id: false });

const EducationSchema = new Schema({
  institutionName: { type: String, trim: true, required: true },
  fieldOfStudy: { type: String, trim: true, required: true },
  degree: { type: String, trim: true, required: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  from: { type: Date, required: true },
  to: { type: Date },
  currentlyStudying: { type: Boolean, default: false },
  gpa: { type: Number, min: 0, max: 4 },
  honors: { type: String, trim: true },
  description: [{ type: String, trim: true }],
}, { _id: false });

const TrainingSchema = new Schema({
  name: { type: String, trim: true, required: true },
  institution: { type: String, trim: true, required: true },
  duration: { type: String, trim: true },
  from: { type: Date },
  to: { type: Date },
  description: [{ type: String, trim: true }],
}, { _id: false });

const CertificationSchema = new Schema({
  name: { type: String, trim: true, required: true },
  authority: { type: String, trim: true, required: true },
  urlCode: { type: String, trim: true },
  date: { type: Date, required: true },
  description: [{ type: String, trim: true }],
}, { _id: false });

const SkillSchema = new Schema({
  name: { type: String, trim: true, required: true },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Advanced'
  }
}, { _id: false });

const SkillCategorySchema = new Schema({
  category: { type: String, trim: true, required: true },
  skills: [SkillSchema]
}, { _id: false });

const ReferenceSchema = new Schema({
  name: { type: String, trim: true, required: true },
  position: { type: String, trim: true },
  company: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Please use a valid email'] },
  relationship: { type: String, trim: true },
}, { _id: false });

const PersonalInfoSchema = new Schema({
  titleBefore: { type: String, trim: true },
  titleAfter: { type: String, trim: true },
  firstName: { type: String, trim: true, required: true },
  lastName: { type: String, trim: true, required: true },
  professionalTitle: { type: String, trim: true },
  phoneNumber: { type: String, trim: true, required: true },
  emailAddress: { type: String, trim: true, lowercase: true, required: true, match: [/^\S+@\S+\.\S+$/, 'Please use a valid email'] },
  address: AddressSchema,
  permanentAddress: AddressSchema,
  skype: { type: String, trim: true },
  linkedIn: { type: String, trim: true },
  portfolio: { type: String, trim: true },
  profilePicture: { type: String, trim: true },
  fatherName: { type: String, trim: true },
  motherName: { type: String, trim: true },
  spouseName: { type: String, trim: true },
  nid: { type: String, trim: true },
  passport: { type: String, trim: true },
}, { _id: false });

// Main Resume Schema
const ResumeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  personalInfo: { type: PersonalInfoSchema, required: true },
  workExperience: [WorkExperienceSchema],
  education: [EducationSchema],
  trainings: [TrainingSchema],
  certifications: [CertificationSchema],
  skills: [SkillCategorySchema],
  references: [ReferenceSchema],
  careerObjective: { type: String, trim: true },
  careerSummary: { type: String, trim: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

addSoftDelete(ResumeSchema);
ResumeSchema.index({ user: 1, createdAt: -1 });

ResumeSchema.pre('save', function (next) {
  this.workExperience.forEach(exp => {
    if (exp.to && exp.from > exp.to) {
      throw new Error('From date must be before To date in work experience');
    }
  });
  this.education.forEach(edu => {
    if (edu.to && edu.from > edu.to) {
      throw new Error('From date must be before To date in education');
    }
  });
  this.trainings.forEach(train => {
    if (train.to && train.from > train.to) {
      throw new Error('From date must be before To date in trainings');
    }
  });
  next();
});

const Resume = mongoose.model('Resume', ResumeSchema);
export default Resume;