# DeGarda

A modern hospital shift scheduling application built with Next.js and Tailwind CSS, specifically designed for Romanian medical facilities. Features intelligent shift scheduling, fair workload distribution, and comprehensive staff management.

## 🚀 Current Features

### 🔐 Authentication & Access Control
- **Role-Based Permissions**: Different access levels for staff, managers, and administrators

### 📅 Smart Shift Scheduling
- **One Cell = One Complete Coverage**: Each calendar day shows logical shift patterns
  - **Weekends**: Single 24-hour shifts for efficiency
  - **Weekdays**: Combined day + night 12-hour shifts for work-life balance
- **Fair Scheduling Engine**: Automated fair distribution of day/night/weekend shifts
- **Constraint Checking**: Prevents consecutive night shifts for safety
- **Visual Indicators**: Clear display of complete vs partial coverage

### 👥 Staff Management (Doctors Only)
- **Simplified Staffing**: One doctor per shift requirement
- **10 Medical Specializations**: Urgențe, Chirurgie, ATI, Pediatrie, Cardiologie, Neurologie, Ortopedice, Ginecologie, Oftalmologie, Dermatologie
- **Unavailability Management**: Set individual doctor "can't work" dates
- **Multi-Hospital Support**: Manage staff across multiple hospitals

### 🏥 Hospital Administration
- **Complete CRUD Operations**: Add, edit, delete hospitals
- **Staff Assignment**: Assign doctors to specific hospitals
- **Department Filtering**: View staff by medical specialization
- **Coverage Analytics**: Real-time coverage status and warnings

### 🎛️ Admin Panel Features
- **Personnel Management**: Add/edit medical staff with full details
- **Hospital Management**: Complete hospital lifecycle management
- **Shift Type Configuration**: Manage 12-hour and 24-hour shift types
- **Clean Interface**: Removed unnecessary system settings for focused functionality

## Tech Stack

- **Framework**: Next.js 13+
- **Styling**: Tailwind CSS 3.3+
- **Icons**: Custom SVG icon library
- **Deployment**: Optimized for Vercel

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ObuObuHub/medical-shift-scheduler.git
cd medical-shift-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser


### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

The application is optimized for Vercel with automatic deployments from Git.

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `.next` folder to your hosting provider.

## 📋 How to Use

### Login
1. Open the application in your browser
2. Contact your system administrator for login credentials
3. Enter your assigned username and password

### Generate Fair Schedules
1. Navigate to **Calendar** view
2. Click the green **"Genereaza"** button
3. System automatically creates fair shift distribution:
   - Weekends: 24-hour shifts
   - Weekdays: Day + Night 12-hour shifts
   - Equal workload distribution across all doctors

### Manage Staff Unavailability
1. Go to **Personal** view
2. Click **"Calendar"** button next to any doctor's name
3. Add dates when the doctor cannot work
4. System respects these dates during schedule generation

### Admin Functions
1. Navigate to **Administrare** panel (admin only)
2. **Add Personnel**: Click "Adaugă Personal" to add new doctors
3. **Manage Hospitals**: Add/edit hospital information
4. **Staff Overview**: View and edit all personnel details

## 🏗️ Project Structure

```
medical-shift-scheduler/
├── components/
│   ├── AdminPanel.jsx           # Admin management interface
│   ├── AuthContext.jsx          # Authentication system
│   ├── CalendarView.jsx         # Main calendar display
│   ├── DataContext.jsx          # Data management & fair scheduling
│   ├── HospitalEditModal.jsx    # Hospital add/edit modal
│   ├── MatrixView.jsx           # Staff planning matrix
│   ├── StaffEditModal.jsx       # Staff add/edit modal
│   ├── StaffView.jsx            # Staff management view
│   └── Icons.jsx                # SVG icon components
├── utils/
│   ├── shiftEngine.js           # Fair scheduling algorithm
│   ├── dateHelpers.js           # Date utility functions
│   └── staffHelpers.js          # Staff utility functions
├── pages/
│   ├── _app.js                  # Next.js app wrapper
│   └── index.js                 # Main application
└── styles/
    └── globals.css              # Global styles and Tailwind
```

## ⚙️ Configuration

### Shift Types
The system uses three shift types defined in `components/DataContext.jsx`:
- **Gardă de Zi (12h)**: 08:00 - 20:00
- **Tură de Noapte (12h)**: 20:00 - 08:00  
- **Gardă 24 ore**: 08:00 - 08:00

### Medical Specializations
Available specializations in `components/StaffEditModal.jsx`:
- Urgențe, Chirurgie, ATI, Pediatrie, Cardiologie
- Neurologie, Ortopedice, Ginecologie, Oftalmologie, Dermatologie

## ✨ Key Features Walkthrough

### 📅 Calendar View
- **Logical Organization**: One cell = One complete shift coverage
- **Smart Grouping**: Shows "24h Gardă", "Zi + Noapte", or "Parțial" coverage
- **Visual Indicators**: Medical staff emoji (👨‍⚕️) and coverage status
- **Fair Generation**: Single "Genereaza" button creates optimal schedules

### 👥 Staff Management
- **Doctors Only**: Simplified to medical staff only (one doctor per shift)
- **Unavailability**: Individual calendar management for "can't work" dates
- **Specializations**: 10 medical departments with filtering
- **Multi-Hospital**: Assign doctors across different hospitals

### 🎛️ Admin Panel
- **Personnel CRUD**: Complete add/edit/delete staff operations
- **Hospital Management**: Multi-facility management
- **Clean Interface**: Focused on essential functions only
- **Real-time Updates**: Immediate data persistence with notifications

### 🤖 Fair Scheduling Engine
- **Weighted Distribution**: Equal workload across all doctors
- **Constraint Checking**: No consecutive night shifts
- **Availability Respect**: Honors individual unavailable dates
- **Pattern Recognition**: Optimal weekend vs weekday scheduling

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Recent Updates

### v2.0 - Major Overhaul (Current)
- ✅ Fixed authentication (manager login now works)
- ✅ Added missing admin modals for staff and hospital management
- ✅ Implemented fair scheduling engine with constraint checking
- ✅ Simplified to doctors-only staffing model
- ✅ Enhanced calendar with logical shift organization
- ✅ Removed system settings for cleaner interface
- ✅ Added staff unavailability management
- ✅ Optimized bundle size to 16.7kB

### Performance & Bundle Size
- **Highly Optimized**: 16.7kB total bundle size
- **Fast Loading**: Static HTML generation with Next.js
- **Efficient**: Minimal JavaScript for maximum performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, questions, or feature requests:
- Create an issue in the [GitHub repository](https://github.com/ObuObuHub/medical-shift-scheduler/issues)
- Contact the development team

---

Built with ❤️ for Romanian healthcare workers using modern web technologies.
