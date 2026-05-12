import { Phone, Heart, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'axis_emergency_id';

export function getEmergencyID() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveEmergencyID(data) {
  // Intentionally plaintext — paramedics must read this without unlocking the app
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const EMPTY_EMERGENCY_ID = {
  full_name: '',
  date_of_birth: '',
  blood_type: '',
  conditions: '',
  allergies: '',
  critical_medications: '',
  gp_name: '',
  gp_phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  notes: '',
};

// Read-only card shown on lock screen — no authentication required
export default function EmergencyIDCard({ onClose }) {
  const id = getEmergencyID();

  if (!id || !id.full_name) {
    return (
      <div className="bg-gray-900 border border-red-600 rounded-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <span className="text-white font-bold text-lg">Emergency Medical ID</span>
        </div>
        <p className="text-gray-400 text-sm">
          No Emergency ID set up. Open the app and go to Settings → Emergency Medical ID to add your information.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full py-3 rounded-xl bg-gray-800 text-orange-400 font-semibold text-base active:bg-gray-700"
          >
            Back to Lock Screen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border-2 border-red-600 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Emergency Medical ID</p>
          <p className="text-white font-bold text-xl leading-tight">{id.full_name}</p>
        </div>
      </div>

      {(id.date_of_birth || id.blood_type) && (
        <div className="flex gap-4">
          {id.date_of_birth && (
            <div>
              <p className="text-xs text-gray-500 uppercase">DOB</p>
              <p className="text-white font-medium">{id.date_of_birth}</p>
            </div>
          )}
          {id.blood_type && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Blood Type</p>
              <p className="text-red-400 font-bold text-lg">{id.blood_type}</p>
            </div>
          )}
        </div>
      )}

      {id.conditions && (
        <div>
          <p className="text-xs text-gray-500 uppercase mb-1">Conditions</p>
          <p className="text-orange-300 text-sm leading-snug">{id.conditions}</p>
        </div>
      )}

      {id.allergies && (
        <div>
          <p className="text-xs text-gray-500 uppercase mb-1">Allergies</p>
          <p className="text-yellow-300 text-sm leading-snug">{id.allergies}</p>
        </div>
      )}

      {id.critical_medications && (
        <div>
          <p className="text-xs text-gray-500 uppercase mb-1">Critical Medications</p>
          <p className="text-green-300 text-sm leading-snug">{id.critical_medications}</p>
        </div>
      )}

      {id.notes && (
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-snug">{id.notes}</p>
        </div>
      )}

      {(id.emergency_contact_name || id.emergency_contact_phone) && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 uppercase mb-1">Emergency Contact</p>
          <p className="text-white font-medium">
            {id.emergency_contact_name}
            {id.emergency_contact_relationship ? ` (${id.emergency_contact_relationship})` : ''}
          </p>
          {id.emergency_contact_phone && (
            <a
              href={`tel:${id.emergency_contact_phone}`}
              className="flex items-center gap-1 text-orange-400 text-lg font-bold mt-1"
            >
              <Phone className="w-4 h-4" />
              {id.emergency_contact_phone}
            </a>
          )}
        </div>
      )}

      {id.gp_name && (
        <div>
          <p className="text-xs text-gray-500 uppercase mb-1">GP / Doctor</p>
          <p className="text-white text-sm">{id.gp_name}</p>
          {id.gp_phone && (
            <a href={`tel:${id.gp_phone}`} className="text-orange-400 text-sm">{id.gp_phone}</a>
          )}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gray-800 text-orange-400 font-semibold text-base active:bg-gray-700 mt-2"
        >
          Back to Lock Screen
        </button>
      )}
    </div>
  );
}
