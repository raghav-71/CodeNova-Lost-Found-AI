import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { ItemCategory, ConsistencyCheckResult } from '../types/index.js';
import { uploadItemImageToSupabase, isSupabaseConfigured } from '../services/supabase.js';
import { MultimodalMismatchModal } from '../components/MultimodalMismatchModal.js';
import { 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  X, 
  MapPin, 
  Calendar, 
  Tag, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  Camera
} from 'lucide-react';

const CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Books',
  'Bags',
  'Clothing',
  'Accessories',
  'ID Cards',
  'Other'
];

const CAMPUS_LOCATIONS = [
  'Main University Library',
  'Student Center & Cafeteria',
  'Science Building & Labs',
  'Engineering Building (Hall A/B)',
  'Campus Recreation & Sports Complex',
  'North Quad / Dormitories',
  'South Arts & Design Pavilion',
  'Campus Parking Lots',
  'Other Campus Location'
];

export function ReportLostPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(CAMPUS_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [buildingZone, setBuildingZone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multimodal AI Verification State
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [detectedConsistency, setDetectedConsistency] = useState<ConsistencyCheckResult | null>(null);

  const handleImageChange = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp|heic|heif)$/i) && !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be under 10MB.');
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const executeSubmission = async () => {
    const finalLocation = location === 'Other Campus Location' ? customLocation.trim() : location;
    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile && isSupabaseConfigured) {
        try {
          uploadedImageUrl = await uploadItemImageToSupabase(imageFile);
        } catch (storageErr) {
          console.warn('Supabase storage upload failed, falling back to server upload:', storageErr);
        }
      }

      const formData = new FormData();
      formData.append('type', 'LOST');
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('description', description.trim());
      formData.append('location', finalLocation);
      if (buildingZone.trim()) formData.append('building_zone', buildingZone.trim());
      formData.append('date', date);
      if (time.trim()) formData.append('time', time.trim());
      if (characteristics.trim()) formData.append('characteristics', characteristics.trim());
      if (uploadedImageUrl) {
        formData.append('imageUrl', uploadedImageUrl);
      } else if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await api.createItem(formData);

      if (res.consistency?.has_mismatch) {
        showToast({
          type: 'info',
          title: 'Report Published with Discrepancy Note',
          message: res.consistency.warning_message || 'Report logged. AI will evaluate matches using both text and image cues.'
        });
      } else {
        showToast({
          type: 'success',
          title: 'Lost Item Reported',
          message: `Successfully listed! AI detected ${res.matchesFound} potential matches in campus records.`
        });
      }

      navigate(`/items/${res.item.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit lost report.');
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to submit report.'
      });
    } finally {
      setIsSubmitting(false);
      setMismatchModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Item title and description are required.');
      return;
    }

    const finalLocation = location === 'Other Campus Location' ? customLocation.trim() : location;
    if (!finalLocation) {
      setError('Please specify the campus location.');
      return;
    }

    // Pre-validate Image + Text consistency if image is provided
    if (imageFile) {
      setIsSubmitting(true);
      try {
        const verifyForm = new FormData();
        verifyForm.append('title', title.trim());
        verifyForm.append('description', description.trim());
        verifyForm.append('category', category);
        verifyForm.append('image', imageFile);

        const verifyRes = await api.verifyImage(verifyForm);
        if (verifyRes.consistency && verifyRes.consistency.has_mismatch) {
          setDetectedConsistency(verifyRes.consistency);
          setMismatchModalOpen(true);
          setIsSubmitting(false);
          return;
        }
      } catch (verifyErr) {
        console.warn('Image verification check failed, proceeding with direct creation:', verifyErr);
      }
      setIsSubmitting(false);
    }

    await executeSubmission();
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs font-bold uppercase tracking-wide">
            <span>Report Lost Property</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#102018] tracking-tight">
            Lost an Item on Campus?
          </h1>
          <p className="text-xs sm:text-sm text-[#66756C] font-medium">
            Submit item details and photos. FindIt AI will immediately compare against found records and alert you of matches.
          </p>
        </div>

        {/* Step Indicator Header (Mobile-first responsive version) */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-2 p-3 bg-white border border-[#E3ECE6] rounded-2xl text-center text-xs font-bold shadow-sm">
          <div className="text-[#168A4A] bg-[#EEF8F1] py-1.5 rounded-xl border border-[#D5ECD9]">01 ITEM</div>
          <div className="text-[#168A4A] bg-[#EEF8F1] py-1.5 rounded-xl border border-[#D5ECD9]">02 DETAILS</div>
          <div className="text-[#168A4A] bg-[#EEF8F1] py-1.5 rounded-xl border border-[#D5ECD9]">03 LOCATION</div>
          <div className="text-[#168A4A] bg-[#EEF8F1] py-1.5 rounded-xl border border-[#D5ECD9]">04 IMAGE</div>
          <div className="text-[#35B86B] bg-[#E6F7EC] py-1.5 rounded-xl border border-[#35B86B]/30 font-extrabold">05 SUBMIT</div>
        </div>

        {/* Compact Mobile Step Badge */}
        <div className="sm:hidden flex items-center justify-between p-3 bg-white border border-[#E3ECE6] rounded-2xl shadow-sm text-xs font-bold">
          <span className="text-[#168A4A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#35B86B]"></span>
            Lost Item Registration Form
          </span>
          <span className="text-[#66756C] text-[11px]">All fields encrypted</span>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Item Information */}
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-8 space-y-4 sm:space-y-5 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A39B] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#35B86B]" />
              <span>1. Item Identification</span>
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-[#102018] mb-1.5">
                Item Title / Model <span className="text-[#E11D48]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Space Black MacBook Pro 14 (M3) or Blue Herschel Backpack"
                className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-[#102018] mb-1.5">
                Category <span className="text-[#E11D48]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all touch-target flex items-center justify-center ${
                      category === cat
                        ? 'bg-[#EEF8F1] text-[#168A4A] border-[#35B86B] shadow-sm'
                        : 'bg-[#F7FBF8] text-[#66756C] hover:text-[#102018] border-[#E3ECE6]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#102018] mb-1.5">
                Detailed Description <span className="text-[#E11D48]">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe color, brand, model, size, approximate age, and what the item looks like..."
                className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20 resize-none"
              />
            </div>

            {/* Distinctive Characteristics */}
            <div>
              <label className="block text-xs font-bold text-[#102018] mb-1.5">
                Distinctive Identifying Marks (Crucial for AI Matching)
              </label>
              <input
                type="text"
                value={characteristics}
                onChange={(e) => setCharacteristics(e.target.value)}
                placeholder="e.g. Octocat sticker on lower left lid, small scratch near camera, keychain with initials 'SL'"
                className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20"
              />
            </div>
          </div>

          {/* Section 2: Location and Timeline (Single column on mobile) */}
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-8 space-y-4 sm:space-y-5 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A39B] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#35B86B]" />
              <span>2. Campus Location & Incident Timeline</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102018] mb-1.5">
                  Campus Facility / Area <span className="text-[#E11D48]">*</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B]"
                >
                  {CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102018] mb-1.5">
                  Specific Zone / Floor / Room
                </label>
                <input
                  type="text"
                  value={buildingZone}
                  onChange={(e) => setBuildingZone(e.target.value)}
                  placeholder="e.g. 3rd Floor Quiet Study Pods or Room 204"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B]"
                />
              </div>

              {location === 'Other Campus Location' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#102018] mb-1.5">
                    Custom Location Name <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Enter precise campus location"
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#102018] mb-1.5">
                  Date Lost <span className="text-[#E11D48]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102018] mb-1.5">
                  Approximate Time (Optional)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Image Upload (Mobile Camera + Photo Library supported) */}
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-8 space-y-4 sm:space-y-5 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A39B] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#35B86B]" />
              <span>3. Image & Photo Reference</span>
            </h2>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#E3ECE6] bg-[#F7FBF8] max-w-sm mx-auto shadow-sm">
                <img src={imagePreview} alt="Preview" className="w-full aspect-[16/10] object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 hover:bg-[#E11D48] hover:text-white text-[#102018] transition-colors shadow-md flex items-center justify-center touch-target"
                  aria-label="Remove photo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#C7EED4] hover:border-[#35B86B] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer bg-[#F7FBF8] hover:bg-[#EEF8F1] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#35B86B] border border-[#D5ECD9] flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#102018] text-center">
                  Take photo with camera or <span className="text-[#168A4A] underline">browse files</span>
                </div>
                <div className="text-[11px] sm:text-xs text-[#66756C] mt-1 font-medium">Supports JPG, PNG, WebP up to 10MB</div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#35B86B]/30 disabled:opacity-50 touch-target"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Publishing Report & Scanning AI Matches...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Submit Lost Item Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Multimodal Contradiction & Warning Modal */}
        {detectedConsistency && (
          <MultimodalMismatchModal
            isOpen={mismatchModalOpen}
            consistency={detectedConsistency}
            isSubmitting={isSubmitting}
            onEditDetails={() => {
              setMismatchModalOpen(false);
            }}
            onContinueAnyway={() => {
              executeSubmission();
            }}
            onClose={() => setMismatchModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
