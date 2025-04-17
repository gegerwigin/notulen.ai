import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ContentEditor = () => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Hero section state
  const [heroContent, setHeroContent] = useState({
    title: '',
    subtitle: '',
    description: '',
    ctaText: ''
  });
  
  // Features section state
  const [featuresContent, setFeaturesContent] = useState({
    items: [
      { icon: '', title: '', description: '' },
      { icon: '', title: '', description: '' },
      { icon: '', title: '', description: '' },
      { icon: '', title: '', description: '' }
    ]
  });
  
  // Steps section state
  const [stepsContent, setStepsContent] = useState({
    items: [
      { icon: '', title: '', description: '' },
      { icon: '', title: '', description: '' },
      { icon: '', title: '', description: '' }
    ]
  });
  
  // Demo section state
  const [demoContent, setDemoContent] = useState({
    title: '',
    subtitle: '',
    tagline: ''
  });
  
  // Redirect non-admin users
  if (!currentUser || !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch hero content
        const heroDoc = await getDoc(doc(db, 'landingPageContent', 'hero'));
        if (heroDoc.exists()) {
          setHeroContent(heroDoc.data() as any);
        }
        
        // Fetch features content
        const featuresDoc = await getDoc(doc(db, 'landingPageContent', 'features'));
        if (featuresDoc.exists()) {
          setFeaturesContent(featuresDoc.data() as any);
        }
        
        // Fetch steps content
        const stepsDoc = await getDoc(doc(db, 'landingPageContent', 'steps'));
        if (stepsDoc.exists()) {
          setStepsContent(stepsDoc.data() as any);
        }
        
        // Fetch demo content
        const demoDoc = await getDoc(doc(db, 'landingPageContent', 'demo'));
        if (demoDoc.exists()) {
          setDemoContent(demoDoc.data() as any);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        setMessage('Error loading content. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, []);
  
  const saveContent = async (section: string) => {
    try {
      setSaving(true);
      
      let content;
      let docRef;
      
      switch (section) {
        case 'hero':
          content = heroContent;
          docRef = doc(db, 'landingPageContent', 'hero');
          break;
        case 'features':
          content = featuresContent;
          docRef = doc(db, 'landingPageContent', 'features');
          break;
        case 'steps':
          content = stepsContent;
          docRef = doc(db, 'landingPageContent', 'steps');
          break;
        case 'demo':
          content = demoContent;
          docRef = doc(db, 'landingPageContent', 'demo');
          break;
        default:
          throw new Error('Invalid section');
      }
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, content);
      } else {
        await setDoc(docRef, content);
      }
      
      setMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} content saved successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error saving content:", error);
      setMessage('Error saving content. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const updateFeature = (index: number, field: string, value: string) => {
    const updatedFeatures = [...featuresContent.items];
    updatedFeatures[index] = { ...updatedFeatures[index], [field]: value };
    setFeaturesContent({ ...featuresContent, items: updatedFeatures });
  };
  
  const updateStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...stepsContent.items];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setStepsContent({ ...stepsContent, items: updatedSteps });
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Content Editor</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'hero' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('hero')}
        >
          Hero Section
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'features' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('features')}
        >
          Features
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'steps' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('steps')}
        >
          How It Works
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'demo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('demo')}
        >
          Demo Section
        </button>
      </div>
      
      {/* Hero Section Form */}
      {activeTab === 'hero' && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Hero Section</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Title (First Line)</label>
            <input
              type="text"
              value={heroContent.title}
              onChange={(e) => setHeroContent({...heroContent, title: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. Revolusi Catat Rapat"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Subtitle (Second Line)</label>
            <input
              type="text"
              value={heroContent.subtitle}
              onChange={(e) => setHeroContent({...heroContent, subtitle: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. dengan Kecerdasan Buatan"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea
              value={heroContent.description}
              onChange={(e) => setHeroContent({...heroContent, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter hero description"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">CTA Button Text</label>
            <input
              type="text"
              value={heroContent.ctaText}
              onChange={(e) => setHeroContent({...heroContent, ctaText: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. Mulai Gratis"
            />
          </div>
          
          <button
            onClick={() => saveContent('hero')}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Hero Section'}
          </button>
        </div>
      )}
      
      {/* Features Section Form */}
      {activeTab === 'features' && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Features Section</h2>
          
          {featuresContent.items.map((feature, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg">
              <h3 className="font-medium mb-3">Feature {index + 1}</h3>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Icon Name</label>
                <input
                  type="text"
                  value={feature.icon}
                  onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Brain, Shield, Users, Globe2"
                />
                <p className="text-xs text-gray-500 mt-1">Use Lucide icon names: Brain, Shield, Users, Globe2, etc.</p>
              </div>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) => updateFeature(index, 'title', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Feature title"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={feature.description}
                  onChange={(e) => updateFeature(index, 'description', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Feature description"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => saveContent('features')}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Features'}
          </button>
        </div>
      )}
      
      {/* Steps Section Form */}
      {activeTab === 'steps' && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">How It Works Section</h2>
          
          {stepsContent.items.map((step, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg">
              <h3 className="font-medium mb-3">Step {index + 1}</h3>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Icon Name</label>
                <input
                  type="text"
                  value={step.icon}
                  onChange={(e) => updateStep(index, 'icon', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Mic, Brain, FileText"
                />
                <p className="text-xs text-gray-500 mt-1">Use Lucide icon names: Mic, Brain, FileText, etc.</p>
              </div>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Step title"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={step.description}
                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Step description"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => saveContent('steps')}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Steps'}
          </button>
        </div>
      )}
      
      {/* Demo Section Form */}
      {activeTab === 'demo' && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Demo Section</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={demoContent.title}
              onChange={(e) => setDemoContent({...demoContent, title: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. Catat Rapat Otomatis"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Subtitle</label>
            <input
              type="text"
              value={demoContent.subtitle}
              onChange={(e) => setDemoContent({...demoContent, subtitle: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Enter subtitle"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Tagline</label>
            <input
              type="text"
              value={demoContent.tagline}
              onChange={(e) => setDemoContent({...demoContent, tagline: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. Teknologi AI Terdepan"
            />
          </div>
          
          <button
            onClick={() => saveContent('demo')}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Demo Section'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
