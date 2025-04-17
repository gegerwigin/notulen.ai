import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, FileText, Users, Brain, Globe2, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Landing() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Default content for fallback
  const defaultHero = {
    title: "Revolusi Catat Rapat",
    subtitle: "dengan Kecerdasan Buatan",
    description: "Ubah setiap rapat menjadi catatan yang terstruktur dan dapat ditindaklanjuti. Notula.ai menggunakan AI canggih untuk mencatat, merangkum, dan mengorganisir rapat Anda.",
    ctaText: "Mulai Gratis"
  };
  
  const defaultFeatures = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI Pintar",
      description: "Transkripsi otomatis dengan pemahaman konteks yang mendalam"
    },
    {
      icon: <Globe2 className="h-8 w-8" />,
      title: "Multi Bahasa",
      description: "Mendukung Bahasa Indonesia dan berbagai bahasa lainnya"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Kolaborasi Tim",
      description: "Bagikan dan edit catatan bersama tim Anda"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Keamanan Terjamin",
      description: "Enkripsi end-to-end untuk data rapat Anda"
    }
  ];
  
  const defaultSteps = [
    {
      icon: <Mic className="h-10 w-10" />,
      title: "Rekam",
      description: "Rekam rapat Anda secara langsung atau unggah rekaman yang sudah ada"
    },
    {
      icon: <Brain className="h-10 w-10" />,
      title: "Transkripsi",
      description: "AI kami mengubah suara menjadi teks dengan akurasi tinggi"
    },
    {
      icon: <FileText className="h-10 w-10" />,
      title: "Rangkuman",
      description: "Dapatkan poin-poin penting dan tindak lanjut dari rapat Anda"
    }
  ];
  
  const defaultDemo = {
    title: "Catat Rapat Otomatis",
    subtitle: "Fokus pada diskusi yang penting, biarkan AI kami yang mencatat setiap detail",
    tagline: "Teknologi AI Terdepan"
  };
  
  // State untuk konten dinamis
  const [hero, setHero] = useState(defaultHero);
  const [features, setFeatures] = useState(defaultFeatures);
  const [steps, setSteps] = useState(defaultSteps);
  const [demo, setDemo] = useState(defaultDemo);
  
  // Fungsi untuk mendapatkan icon component berdasarkan nama
  const getIconByName = (iconName: string, size: number = 8) => {
    switch (iconName) {
      case 'Brain':
        return <Brain className={`h-${size} w-${size}`} />;
      case 'Globe2':
        return <Globe2 className={`h-${size} w-${size}`} />;
      case 'Users':
        return <Users className={`h-${size} w-${size}`} />;
      case 'Shield':
        return <Shield className={`h-${size} w-${size}`} />;
      case 'Mic':
        return <Mic className={`h-${size} w-${size}`} />;
      case 'FileText':
        return <FileText className={`h-${size} w-${size}`} />;
      default:
        return <Brain className={`h-${size} w-${size}`} />;
    }
  };
  
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Uncomment line below if you want to auto-redirect logged in users to dashboard
      // navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  // Fetch content from Firestore
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch hero content
        const heroDoc = await getDoc(doc(db, 'landingPageContent', 'hero'));
        if (heroDoc.exists()) {
          setHero({ ...defaultHero, ...heroDoc.data() });
        }
        
        // Fetch features content
        const featuresDoc = await getDoc(doc(db, 'landingPageContent', 'features'));
        if (featuresDoc.exists() && featuresDoc.data().items) {
          const featuresData = featuresDoc.data().items;
          const processedFeatures = featuresData.map((feature: any) => ({
            icon: getIconByName(feature.icon),
            title: feature.title,
            description: feature.description
          }));
          setFeatures(processedFeatures);
        }
        
        // Fetch steps content
        const stepsDoc = await getDoc(doc(db, 'landingPageContent', 'steps'));
        if (stepsDoc.exists() && stepsDoc.data().items) {
          const stepsData = stepsDoc.data().items;
          const processedSteps = stepsData.map((step: any) => ({
            icon: getIconByName(step.icon, 10),
            title: step.title,
            description: step.description
          }));
          setSteps(processedSteps);
        }
        
        // Fetch demo content
        const demoDoc = await getDoc(doc(db, 'landingPageContent', 'demo'));
        if (demoDoc.exists()) {
          setDemo({ ...defaultDemo, ...demoDoc.data() });
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        // Fallback to default content already set
      }
    };
    
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50">
      <Navbar />
      
      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
              <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 pb-2">
                {hero.title}
              </span>
              <span className="mt-4 block text-gray-900">
                {hero.subtitle}
              </span>
            </h1>
            
            <p className="mt-8 text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {hero.description}
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <div className="group inline-flex items-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden">
                <span
                  className="absolute inset-0 bg-white/10"
                />
                {hero.ctaText}
                <Sparkles className="ml-2 h-5 w-5 group-hover:animate-pulse" />
              </div>
              
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-xl text-blue-700 bg-white border-2 border-blue-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
              >
                Masuk
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                >
                  <div
                    className="text-blue-600 mb-4 transform group-hover:scale-110 transition-transform duration-300"
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="py-20">
            <h2 className="text-4xl font-bold text-center mb-16">Bagaimana Notula.ai Bekerja</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {steps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-8 inline-flex mb-6 group-hover:scale-105 transition-all duration-300">
                    <div className="text-blue-600">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Section */}
          <div className="py-20">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-12">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '30px 30px'
                }}></div>
              </div>
              
              <div className="relative">
                <div className="text-center mb-12">
                  <span className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-blue-100 text-sm font-medium mb-4">
                    {demo.tagline}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{demo.title}</h2>
                  <p className="text-xl text-blue-100">{demo.subtitle}</p>
                </div>

                <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 group">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl group-hover:scale-105 transition-transform duration-300">
                          <Mic className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Rekaman HD</h3>
                          <p className="text-gray-600">Hasil rekaman jernih & bebas noise</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl group-hover:scale-105 transition-transform duration-300">
                          <Brain className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">AI Pintar</h3>
                          <p className="text-gray-600">Akurasi transkripsi 98%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl group-hover:scale-105 transition-transform duration-300">
                          <FileText className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Rangkuman</h3>
                          <p className="text-gray-600">Poin penting otomatis</p>
                        </div>
                      </div>
                    </div>
                    <div className="group">
                      <button className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-center hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                        <div className="bg-white/10 p-6 rounded-full inline-flex mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Mic className="h-12 w-12 text-white" />
                        </div>
                        <p className="text-white text-xl font-bold">Mulai Rekam</p>
                        <p className="text-blue-200 text-sm mt-2">Coba Demo Sekarang</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-10 text-center text-gray-600 border-t border-gray-100">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-6">
                <Link to="/privacy" className="text-blue-600 hover:underline">Kebijakan Privasi</Link>
                <Link to="/terms" className="text-blue-600 hover:underline">Syarat dan Ketentuan</Link>
              </div>
              <p className="text-sm">
                &copy; {new Date().getFullYear()} Notula.ai. Seluruh hak cipta dilindungi.
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
