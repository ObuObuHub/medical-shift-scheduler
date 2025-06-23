# Medical Shift Scheduler

A comprehensive hospital shift scheduling application built with Next.js and Tailwind CSS, designed for Romanian hospitals.

## Features

### Role-Based Access Control
- **Staff**: View schedules, request shift exchanges
- **Manager**: All staff permissions plus shift assignment, automatic generation, and exchange approval
- **Administrator**: Full system access including staff, hospital, and shift type management

### Shift Management
- **5 Shift Types**: Day, Afternoon, Day Guard, Night, and 24-hour shifts
- **Automatic Generation**: AI-powered shift scheduling for managers
- **Visual Calendar**: Interactive monthly calendar view
- **Staff Assignment**: Drag-and-drop staff assignment with validation

### Staff Features
- **Multi-Hospital Support**: Manage multiple hospitals from one system
- **Staff Categories**: Doctors, Nurses, and Healthcare Workers
- **Specialization Tracking**: Track staff specializations and qualifications
- **Shift Exchange**: Built-in shift trading system with approval workflow

### System Administration
- **Hospital Management**: Add, edit, and manage multiple hospitals
- **Staff Administration**: Complete staff lifecycle management
- **Shift Type Configuration**: Customize shift types, hours, and requirements
- **Real-time Notifications**: System-wide notification system

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
git clone <repository-url>
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

## Project Structure

```
medical-shift-scheduler/
├── components/
│   └── Icons.jsx          # SVG icon components
├── pages/
│   ├── _app.js           # Next.js app wrapper
│   └── index.js          # Main application
├── styles/
│   └── globals.css       # Global styles and Tailwind
├── public/               # Static assets
├── package.json          # Project dependencies
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── vercel.json          # Vercel deployment settings
```

## Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# Add any environment variables here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Customization

- **Colors**: Edit `tailwind.config.js` to change the color scheme
- **Shift Types**: Modify `DEFAULT_SHIFT_TYPES` in `pages/index.js`
- **Hospitals**: Update the initial hospitals array in the component state

## Features Walkthrough

### Calendar View
- Monthly grid layout with shift visualization
- Color-coded shifts by type
- Staff shortage warnings
- Click-to-edit functionality for managers

### Shift Exchange System
- Staff can request shift trades
- Managers can approve/reject requests
- Automatic notifications for all parties
- Reason tracking for exchanges

### Admin Panel
- Complete staff management with roles
- Hospital configuration
- System-wide settings
- Audit trails and notifications

### Automatic Shift Generation
- Algorithm considers staff availability
- Respects minimum staffing requirements
- Balances workload across team
- Handles weekend and holiday patterns

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.

---

Built with ❤️ for Romanian healthcare workers.
