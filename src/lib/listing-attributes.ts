export type AttributeFieldType = 'text' | 'number' | 'select';

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  placeholder?: string;
  options?: string[];
}

export interface CategoryAttributeConfig {
  sectionLabel: string;
  fields: AttributeField[];
}

export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttributeConfig> = {
  'auto-world': {
    sectionLabel: 'Car Details',
    fields: [
      { key: 'make',         label: 'Make',            type: 'text',   placeholder: 'Toyota, BMW…'                           },
      { key: 'model',        label: 'Model',           type: 'text',   placeholder: 'Corolla, 3 Series…'                     },
      { key: 'year',         label: 'Year',            type: 'number', placeholder: '2022'                                    },
      { key: 'mileage',      label: 'Mileage (km)',    type: 'number', placeholder: '45000'                                   },
      { key: 'fuelType',     label: 'Fuel Type',       type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'] },
      { key: 'transmission', label: 'Transmission',    type: 'select', options: ['Manual', 'Automatic']                       },
      { key: 'color',        label: 'Color',           type: 'text',   placeholder: 'White'                                   },
      { key: 'condition',    label: 'Condition',       type: 'select', options: ['New', 'Excellent', 'Good', 'Fair']           },
    ],
  },

  'real-estate': {
    sectionLabel: 'Property Details',
    fields: [
      { key: 'propertyType', label: 'Property Type',  type: 'select', options: ['Apartment', 'Villa', 'House', 'Land', 'Shop', 'Office', 'Warehouse'] },
      { key: 'area',         label: 'Area (m²)',       type: 'number', placeholder: '120'                                     },
      { key: 'rooms',        label: 'Bedrooms',        type: 'number', placeholder: '3'                                       },
      { key: 'bathrooms',    label: 'Bathrooms',       type: 'number', placeholder: '2'                                       },
      { key: 'floor',        label: 'Floor',           type: 'number', placeholder: '4'                                       },
      { key: 'furnished',    label: 'Furnished',       type: 'select', options: ['Yes', 'No', 'Partially']                    },
      { key: 'listingType',  label: 'Listing Type',    type: 'select', options: ['For Sale', 'For Rent']                      },
    ],
  },

  'vehicles': {
    sectionLabel: 'Vehicle Details',
    fields: [
      { key: 'vehicleType',  label: 'Vehicle Type',   type: 'select', options: ['Motorcycle', 'Scooter', 'Bicycle', 'Boat', 'Jet Ski', 'ATV'] },
      { key: 'make',         label: 'Make / Brand',   type: 'text',   placeholder: 'Honda, Yamaha…'                          },
      { key: 'model',        label: 'Model',          type: 'text',   placeholder: 'CB500, R1…'                              },
      { key: 'year',         label: 'Year',           type: 'number', placeholder: '2021'                                    },
      { key: 'mileage',      label: 'Mileage (km)',   type: 'number', placeholder: '12000'                                   },
      { key: 'condition',    label: 'Condition',      type: 'select', options: ['New', 'Excellent', 'Good', 'Fair']           },
      { key: 'color',        label: 'Color',          type: 'text',   placeholder: 'Red'                                     },
    ],
  },

  'shopping': {
    sectionLabel: 'Item Details',
    fields: [
      { key: 'brand',        label: 'Brand',          type: 'text',   placeholder: 'Samsung, Apple, Zara…'                   },
      { key: 'model',        label: 'Model / Name',   type: 'text',   placeholder: 'Galaxy S24, Air Max…'                    },
      { key: 'condition',    label: 'Condition',      type: 'select', options: ['New', 'Like New', 'Good', 'Fair']            },
      { key: 'size',         label: 'Size',           type: 'text',   placeholder: 'M / 42 / One size'                       },
      { key: 'color',        label: 'Color',          type: 'text',   placeholder: 'Black'                                   },
      { key: 'warranty',     label: 'Warranty',       type: 'text',   placeholder: '1 year / No warranty'                    },
    ],
  },

  'heavy-machinery-industry': {
    sectionLabel: 'Equipment Details',
    fields: [
      { key: 'equipmentType', label: 'Equipment Type', type: 'text',   placeholder: 'Excavator, Crane, Generator…'           },
      { key: 'brand',         label: 'Brand',          type: 'text',   placeholder: 'Caterpillar, Komatsu…'                  },
      { key: 'year',          label: 'Year',           type: 'number', placeholder: '2018'                                   },
      { key: 'hoursUsed',     label: 'Hours Used',     type: 'number', placeholder: '3000'                                   },
      { key: 'condition',     label: 'Condition',      type: 'select', options: ['New', 'Excellent', 'Good', 'Needs Repair']  },
      { key: 'listingType',   label: 'Listing Type',   type: 'select', options: ['For Sale', 'For Rent / Hire']              },
    ],
  },

  'craftsmen-services': {
    sectionLabel: 'Service Details',
    fields: [
      { key: 'serviceType',   label: 'Service Type',   type: 'text',   placeholder: 'Plumbing, Electrical, Painting…'       },
      { key: 'experience',    label: 'Years of Experience', type: 'number', placeholder: '5'                                 },
      { key: 'availability',  label: 'Availability',   type: 'text',   placeholder: 'Weekdays 9am–5pm'                       },
      { key: 'coverage',      label: 'Coverage Area',  type: 'text',   placeholder: 'Damascus, Aleppo…'                      },
    ],
  },

  'private-tutors': {
    sectionLabel: 'Tutoring Details',
    fields: [
      { key: 'subject',       label: 'Subject',        type: 'text',   placeholder: 'Math, Physics, English…'                },
      { key: 'level',         label: 'Student Level',  type: 'select', options: ['Primary', 'Middle School', 'High School', 'University', 'All Levels'] },
      { key: 'sessionType',   label: 'Session Type',   type: 'select', options: ['In-person', 'Online', 'Both']              },
      { key: 'availability',  label: 'Availability',   type: 'text',   placeholder: 'Mon / Wed / Fri, evenings'              },
      { key: 'experience',    label: 'Years of Experience', type: 'number', placeholder: '4'                                 },
    ],
  },

  'job-postings': {
    sectionLabel: 'Job Details',
    fields: [
      { key: 'jobType',       label: 'Job Type',       type: 'select', options: ['Full-time', 'Part-time', 'Freelance', 'Internship', 'Contract'] },
      { key: 'industry',      label: 'Industry',       type: 'text',   placeholder: 'Technology, Healthcare, Education…'     },
      { key: 'experienceLevel', label: 'Experience Level', type: 'select', options: ['Entry Level', 'Mid-level', 'Senior', 'Any'] },
      { key: 'workLocation',  label: 'Work Location',  type: 'select', options: ['On-site', 'Remote', 'Hybrid']              },
    ],
  },

  'animal-world': {
    sectionLabel: 'Animal Details',
    fields: [
      { key: 'animalType',    label: 'Animal Type',    type: 'text',   placeholder: 'Dog, Cat, Bird, Horse…'                 },
      { key: 'breed',         label: 'Breed',          type: 'text',   placeholder: 'Labrador, Persian…'                     },
      { key: 'age',           label: 'Age',            type: 'text',   placeholder: '2 years / 6 months'                     },
      { key: 'vaccinated',    label: 'Vaccinated',     type: 'select', options: ['Yes', 'No', 'Partially']                   },
      { key: 'gender',        label: 'Gender',         type: 'select', options: ['Male', 'Female', 'Unknown']                },
    ],
  },

  'looking-for-assistants': {
    sectionLabel: 'Role Details',
    fields: [
      { key: 'roleType',      label: 'Role Type',      type: 'text',   placeholder: 'Driver, Housekeeper, Nurse…'            },
      { key: 'schedule',      label: 'Schedule',       type: 'select', options: ['Full-time', 'Part-time', 'On-call', 'Live-in'] },
      { key: 'experience',    label: 'Experience Required', type: 'select', options: ['Not required', '1+ years', '3+ years', '5+ years'] },
      { key: 'gender',        label: 'Preferred Gender', type: 'select', options: ['Any', 'Male', 'Female']                  },
    ],
  },
};
