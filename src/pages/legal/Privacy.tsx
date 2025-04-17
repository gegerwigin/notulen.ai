import React from 'react';
import Navbar from '../../components/Navbar';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Kebijakan Privasi</h1>
          
          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Pendahuluan</h2>
            <p>
              Selamat datang di Notula.ai. Kami menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi Anda. 
              Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi Anda 
              ketika Anda menggunakan layanan kami.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan beberapa jenis informasi dari pengguna kami, termasuk:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Informasi Akun:</strong> Ketika Anda mendaftar, kami mengumpulkan nama, alamat email, dan kata sandi Anda.</li>
              <li><strong>Informasi Profil:</strong> Anda dapat memilih untuk memberikan informasi tambahan seperti foto profil, jabatan, dan organisasi.</li>
              <li><strong>Konten yang Anda Berikan:</strong> Rekaman audio, transkripsi, dan catatan rapat yang Anda unggah atau buat menggunakan layanan kami.</li>
              <li><strong>Informasi Penggunaan:</strong> Data tentang bagaimana Anda berinteraksi dengan layanan kami, termasuk waktu akses, fitur yang digunakan, dan tindakan yang dilakukan.</li>
              <li><strong>Informasi Perangkat:</strong> Data teknis seperti jenis perangkat, sistem operasi, dan informasi browser yang Anda gunakan.</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Bagaimana Kami Menggunakan Informasi Anda</h2>
            <p>Kami menggunakan informasi yang dikumpulkan untuk:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Menyediakan, memelihara, dan meningkatkan layanan kami.</li>
              <li>Memproses transaksi dan mengirim pemberitahuan terkait akun Anda.</li>
              <li>Memahami bagaimana pengguna menggunakan layanan kami untuk meningkatkan pengalaman pengguna.</li>
              <li>Mengembangkan fitur dan produk baru.</li>
              <li>Mendeteksi, menyelidiki, dan mencegah aktivitas penipuan serta masalah keamanan lainnya.</li>
              <li>Berkomunikasi dengan Anda tentang layanan, pembaruan, dan promosi.</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Integrasi dengan Google</h2>
            <p>
              Saat Anda menggunakan login Google atau mengintegrasikan dengan Google Calendar, kami meminta akses ke informasi tertentu dari akun Google Anda, 
              seperti nama, alamat email, dan foto profil Anda. Untuk integrasi Calendar, kami hanya mengakses detail acara yang diperlukan untuk fungsi aplikasi. 
              Kami tidak menyimpan password Google Anda dan penggunaan data ini tunduk pada Kebijakan Privasi Google.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Bagaimana Kami Berbagi Informasi</h2>
            <p>Kami tidak menjual informasi pribadi Anda kepada pihak ketiga. Kami dapat membagikan informasi dalam situasi berikut:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Dengan Persetujuan Anda:</strong> Ketika Anda secara eksplisit mengizinkan kami melakukannya.</li>
              <li><strong>Untuk Penyedia Layanan:</strong> Dengan mitra dan penyedia layanan yang membantu kami menjalankan bisnis kami.</li>
              <li><strong>Untuk Kepatuhan Hukum:</strong> Jika diwajibkan oleh undang-undang atau menanggapi proses hukum.</li>
              <li><strong>Untuk Perlindungan:</strong> Untuk melindungi hak, privasi, keamanan, atau properti kami.</li>
              <li><strong>Dalam Transaksi Bisnis:</strong> Jika terjadi merger, akuisisi, atau penjualan aset.</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Keamanan Data</h2>
            <p>
              Kami menerapkan langkah-langkah keamanan yang dirancang untuk melindungi informasi pribadi Anda dari akses, pengungkapan, 
              pengubahan, dan penghancuran yang tidak sah. Namun, tidak ada metode transmisi atau penyimpanan elektronik yang 100% aman, 
              jadi kami tidak dapat menjamin keamanan mutlak.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Retensi Data</h2>
            <p>
              Kami menyimpan informasi Anda selama akun Anda aktif atau sejauh diperlukan untuk menyediakan layanan kami. 
              Kami juga menyimpan informasi sejauh diperlukan untuk memenuhi kewajiban hukum kami, menyelesaikan sengketa, 
              dan menegakkan perjanjian kami.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Hak Privasi Anda</h2>
            <p>Tergantung pada lokasi Anda, Anda mungkin memiliki hak tertentu terkait dengan data pribadi Anda, termasuk:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Hak untuk mengakses dan menerima salinan data Anda.</li>
              <li>Hak untuk memperbaiki atau memperbarui data Anda.</li>
              <li>Hak untuk menghapus data Anda.</li>
              <li>Hak untuk membatasi atau menolak pemrosesan data Anda.</li>
              <li>Hak untuk portabilitas data.</li>
              <li>Hak untuk menarik persetujuan.</li>
            </ul>
            <p>
              Untuk menggunakan hak ini, silakan hubungi kami di alamat email yang tercantum di bagian "Hubungi Kami".
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Perubahan pada Kebijakan Privasi Ini</h2>
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memberi tahu Anda tentang perubahan 
              dengan memposting kebijakan baru di situs web kami dan/atau melalui pemberitahuan dalam aplikasi. 
              Kami mendorong Anda untuk meninjau Kebijakan Privasi ini secara berkala.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini atau praktik privasi kami, silakan hubungi kami melalui email di:{' '}
              <a href="mailto:privacy@notula.ai" className="text-blue-600 hover:underline">privacy@notula.ai</a>
            </p>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p>
                Dengan menggunakan layanan Notula.ai, Anda menyetujui pengumpulan dan penggunaan informasi sesuai dengan Kebijakan Privasi ini.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 