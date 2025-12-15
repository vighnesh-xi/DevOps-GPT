# 🚀 DevOps-GPT Frontend Setup Guide

## 📋 Overview

This is a modern React + TypeScript frontend for DevOps-GPT, built with:
- **React 18** + **TypeScript**
- **Vite** for fast development
- **Tailwind CSS** + **shadcn/ui** for beautiful UI
- **React Query** for API state management
- **React Router** for navigation
- **Recharts** for data visualization

## 🛠️ Prerequisites

1. **Node.js 18+** (recommended: use Node.js 18 or later)
2. **npm** or **yarn** or **bun** (package manager)
3. **DevOps-GPT Backend** running on http://localhost:8000

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Navigate to the frontend directory
cd /home/vedant_pop/Documents/devopsGPT_clone/deploy-drift-main

# Install dependencies (choose one)
npm install
# OR
yarn install
# OR
bun install
```

### Step 2: Configure Environment

The environment is already configured in `.env` files:
- **Backend URL**: http://localhost:8000
- **Development mode**: Enabled

### Step 3: Start the Frontend

```bash
# Start development server
npm run dev
# OR
yarn dev
# OR
bun dev
```

The frontend will be available at: **http://localhost:8080**

## 🔧 Connecting to Backend

### 1. Start the Backend First

```bash
# In another terminal, start the DevOps-GPT backend
cd /home/vedant_pop/Documents/devopsGPT_clone/devops-gpt-backend
conda activate devops
python devops_server.py
```

Backend should be running at: **http://localhost:8000**

### 2. Verify Connection

Once both are running:
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📱 Application Features

### 🏠 Dashboard
- **Real-time metrics** from your DevOps-GPT backend
- **Deployment statistics** and success rates
- **System health** monitoring
- **Live charts** and visualizations

### 📊 Log Analysis
- **AI-powered log analysis** using Mistral LLM
- **Search and filter** logs
- **Anomaly detection** results

### 🚨 Anomalies
- **Automated detection** of system anomalies
- **Severity classification**
- **Detailed analysis** and recommendations

### 💡 Recommendations
- **AI-generated suggestions** for improvements
- **Priority-based** recommendations
- **Implementation guidance**

### ⚙️ Settings
- **System configuration**
- **API integration** settings
- **User preferences**

## 🔄 How It Works

### API Integration
The frontend automatically connects to your backend using the API client in `src/lib/api.ts`:

```typescript
// Automatic API calls to backend
apiService.dashboard.getStats()          // → GET /dashboard/stats
apiService.logs.analyze(logs)            // → POST /logs/analyze
apiService.anomalies.detect()            // → GET /anomalies/detect
apiService.recommendations.get()         // → GET /recommendations
```

### Real-time Updates
- **Auto-refresh**: Dashboard updates every 30 seconds
- **Live data**: System metrics refresh every 15 seconds
- **Error handling**: Toast notifications for API errors

### Authentication
- **Login page**: Access control for the application
- **Session management**: Secure user sessions
- **Profile management**: User account settings

## 🎯 Usage Instructions

### 1. Access the Application
1. Open your browser
2. Go to http://localhost:8080
3. You'll see the DevOps-GPT dashboard

### 2. Navigate the Interface
- **Dashboard**: Overview of your DevOps pipeline
- **Logs**: Analyze logs with AI assistance
- **Anomalies**: View detected system anomalies
- **Recommendations**: Get AI-powered improvement suggestions
- **Settings**: Configure application settings

### 3. Analyze Logs
1. Go to **Logs** page
2. Paste your log data
3. Click **"Analyze with AI"**
4. View AI-powered analysis and recommendations

### 4. Monitor System Health
1. **Dashboard** shows real-time system metrics
2. **CPU, Memory, Disk usage** displayed with progress bars
3. **Service status** for all connected systems

## 🛠️ Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── Layout.tsx      # Main layout component
├── pages/              # Application pages
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Logs.tsx        # Log analysis
│   ├── Anomalies.tsx   # Anomaly detection
│   └── ...
├── lib/
│   ├── api.ts          # API client and services
│   └── utils.ts        # Utility functions
└── hooks/              # Custom React hooks
```

### Key Components

1. **API Client** (`src/lib/api.ts`)
   - Handles all backend communication
   - Type-safe API calls
   - Error handling and timeouts

2. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Real-time metrics display
   - Interactive charts
   - Status monitoring

3. **Layout** (`src/components/Layout.tsx`)
   - Navigation sidebar
   - Header with user info
   - Responsive design

### Customization

#### Change Backend URL
Edit `.env` file:
```bash
VITE_API_URL=http://your-backend-url:port
```

#### Add New API Endpoints
Edit `src/lib/api.ts`:
```typescript
// Add new endpoint
NEW_FEATURE: {
  GET: '/new-feature',
}

// Add service method
newFeature: {
  async getData() {
    return apiClient.get(API_ENDPOINTS.NEW_FEATURE.GET);
  },
}
```

## 🧪 Testing

### Manual Testing
1. **Start both backend and frontend**
2. **Navigate through all pages**
3. **Test API connections**
4. **Verify real-time updates**

### API Testing
```bash
# Test backend connectivity
curl http://localhost:8000/health

# Test dashboard data
curl http://localhost:8000/dashboard/stats
```

## 🚨 Troubleshooting

### Common Issues

1. **Frontend won't start**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

2. **Can't connect to backend**
   - Verify backend is running on port 8000
   - Check `.env` file has correct `VITE_API_URL`
   - Check browser console for CORS errors

3. **API errors in console**
   - Ensure backend is running: `python devops_server.py`
   - Check backend logs for errors
   - Verify API endpoints match

4. **Page shows "Loading..." forever**
   - Check browser Network tab for failed requests
   - Verify backend health: http://localhost:8000/health
   - Check console for JavaScript errors

### CORS Issues
If you see CORS errors, the backend already includes CORS middleware. If issues persist:

1. Check backend CORS configuration
2. Ensure backend allows origin: http://localhost:8080
3. Try accessing backend directly: http://localhost:8000

## 🎉 Success Indicators

✅ Frontend starts on port 8080  
✅ Backend accessible at port 8000  
✅ Dashboard loads with real data  
✅ No console errors  
✅ Real-time updates working  
✅ API calls succeed in Network tab  

## 📞 Support

If you encounter issues:
1. Check both backend and frontend logs
2. Verify ports 8000 and 8080 are available
3. Ensure Node.js version is 18+
4. Try clearing browser cache

---

**Your DevOps-GPT full-stack application is now ready!** 🚀

### Quick Commands Summary:
```bash
# Terminal 1: Start Backend
cd devops-gpt-backend && conda activate devops && python devops_server.py

# Terminal 2: Start Frontend  
cd deploy-drift-main && npm run dev

# Access Application
# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```