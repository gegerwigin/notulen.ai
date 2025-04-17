import React from 'react';
import Navbar from '../../components/Navbar';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Syarat dan Ketentuan</h1>
          
          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Penerimaan Syarat</h2>
            <p>
              Selamat datang di Notula.ai. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat dengan Syarat dan Ketentuan ini.
              Jika Anda tidak setuju dengan sebagian atau seluruh Syarat dan Ketentuan ini, Anda tidak boleh mengakses atau menggunakan layanan kami.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Deskripsi Layanan</h2>
            <p>
              Notula.ai adalah platform berbasis cloud yang menyediakan layanan transkripsi, ringkasan, dan pengelolaan catatan rapat
              menggunakan teknologi AI. Layanan kami termasuk tetapi tidak terbatas pada:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Transkripsi otomatis rekaman audio</li>
              <li>Ringkasan rapat dengan AI</li>
              <li>Ekstraksi tindak lanjut dan tugas</li>
              <li>Penyimpanan dan pengelolaan catatan rapat</li>
              <li>Integrasi dengan layanan kalender dan produktivitas</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Akun Pengguna</h2>
            <p>
              Untuk menggunakan beberapa fitur layanan kami, Anda perlu membuat akun. Anda bertanggung jawab untuk:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Menjaga kerahasiaan kata sandi akun Anda</li>
              <li>Membatasi akses ke komputer dan perangkat Anda</li>
              <li>Semua aktivitas yang terjadi dalam akun Anda</li>
            </ul>
            <p>
              Anda harus segera memberi tahu kami tentang setiap pelanggaran keamanan atau penggunaan tidak sah akun Anda.
              Kami tidak bertanggung jawab atas kerugian yang timbul akibat penggunaan tidak sah akun Anda.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Konten Pengguna</h2>
            <p>
              Layanan kami memungkinkan Anda untuk mengunggah, menyimpan, dan berbagi konten, termasuk tetapi tidak terbatas pada
              rekaman audio, transkripsi, dan catatan rapat ("Konten Pengguna"). Anda mempertahankan semua hak dan kepemilikan
              atas Konten Pengguna Anda.
            </p>
            <p>
              Dengan mengunggah Konten Pengguna, Anda memberikan kepada kami lisensi non-eksklusif, di seluruh dunia, bebas royalti untuk
              menggunakan, mereproduksi, memproses, mengadaptasi, mempublikasikan, mentransmisikan, dan menampilkan Konten Pengguna
              tersebut sejauh diperlukan untuk menyediakan layanan kami kepada Anda.
            </p>
            <p>
              Anda bertanggung jawab untuk memastikan bahwa Anda memiliki semua hak, lisensi, persetujuan, dan izin yang diperlukan
              untuk Konten Pengguna yang Anda unggah, dan bahwa Konten Pengguna tersebut tidak melanggar hukum atau hak pihak ketiga.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Pembatasan Penggunaan</h2>
            <p>
              Anda setuju untuk tidak menggunakan layanan kami untuk:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Melanggar hukum atau peraturan yang berlaku</li>
              <li>Melanggar hak kekayaan intelektual pihak ketiga</li>
              <li>Mentransmisikan material yang tidak pantas, menyinggung, atau melanggar hukum</li>
              <li>Menyebarkan malware atau kode berbahaya lainnya</li>
              <li>Mengganggu atau merusak integritas layanan kami</li>
              <li>Mengakses layanan kami melalui cara otomatis tanpa izin</li>
              <li>Mengumpulkan informasi pengguna tanpa persetujuan</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Hak Kekayaan Intelektual</h2>
            <p>
              Layanan dan konten yang tersedia melalui layanan kami, termasuk tetapi tidak terbatas pada teks, grafik, logo, ikon,
              gambar, klip audio, unduhan digital, kompilasi data, dan perangkat lunak, adalah milik Notula.ai atau pemberi lisensinya
              dan dilindungi oleh hukum kekayaan intelektual yang berlaku.
            </p>
            <p>
              Notula.ai memberikan Anda lisensi terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dicabut untuk menggunakan
              layanan untuk tujuan pribadi atau bisnis internal Anda.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Penolakan Jaminan</h2>
            <p>
              Layanan kami disediakan "sebagaimana adanya" dan "sebagaimana tersedia" tanpa jaminan apapun, baik tersurat maupun tersirat.
              Notula.ai tidak memberikan jaminan bahwa layanan akan bebas dari kesalahan atau tersedia tanpa gangguan.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Batasan Tanggung Jawab</h2>
            <p>
              Sejauh diizinkan oleh hukum, Notula.ai tidak akan bertanggung jawab atas kerugian tidak langsung, insidental, khusus,
              konsekuensial, atau punitif, atau kerugian apa pun yang timbul dari kehilangan keuntungan, pendapatan, data, atau
              penggunaan layanan, baik dalam tindakan kontrak, kelalaian, atau bentuk tindakan lainnya, bahkan jika kami telah
              diberitahu tentang kemungkinan kerugian tersebut.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Ganti Rugi</h2>
            <p>
              Anda setuju untuk membebaskan, membela, dan mengganti rugi Notula.ai dan afiliasinya, pejabat, agen, mitra, dan
              karyawannya dari dan terhadap setiap klaim, kewajiban, kerusakan, kerugian, dan biaya, termasuk tetapi tidak terbatas
              pada biaya hukum dan akuntansi yang wajar, yang timbul dari atau dalam hal apa pun terkait dengan (a) penggunaan
              layanan kami; (b) pelanggaran Anda terhadap Syarat dan Ketentuan ini; (c) Konten Pengguna Anda; atau (d) pelanggaran
              Anda terhadap hak pihak ketiga.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Perubahan Layanan dan Syarat</h2>
            <p>
              Kami berhak untuk mengubah atau menghentikan layanan kami, sementara atau permanen, kapan saja tanpa pemberitahuan.
              Kami juga berhak untuk memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Kami akan memberi tahu Anda tentang
              perubahan material dengan memposting pemberitahuan yang jelas di situs web kami atau dengan mengirimkan email kepada Anda.
              Penggunaan berkelanjutan Anda atas layanan kami setelah perubahan tersebut merupakan penerimaan Anda terhadap syarat baru.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">11. Penghentian</h2>
            <p>
              Kami berhak untuk menangguhkan atau menghentikan akses Anda ke layanan kami kapan saja karena alasan apa pun, termasuk
              tetapi tidak terbatas pada pelanggaran Syarat dan Ketentuan ini. Semua ketentuan yang secara alami harus bertahan setelah
              penghentian, termasuk tetapi tidak terbatas pada ketentuan kepemilikan, penafian jaminan, ganti rugi, dan batasan tanggung
              jawab, akan tetap berlaku setelah penghentian.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">12. Hukum yang Berlaku</h2>
            <p>
              Syarat dan Ketentuan ini akan diatur dan ditafsirkan sesuai dengan hukum Indonesia, tanpa memperhatikan ketentuan konflik hukumnya.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">13. Penyelesaian Sengketa</h2>
            <p>
              Setiap sengketa yang timbul dari atau terkait dengan Syarat dan Ketentuan ini atau penggunaan layanan kami akan
              diselesaikan melalui negosiasi dengan itikad baik. Jika sengketa tidak dapat diselesaikan melalui negosiasi, sengketa
              tersebut akan diselesaikan melalui arbitrase yang mengikat sesuai dengan peraturan Badan Arbitrase Nasional Indonesia.
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">14. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang Syarat dan Ketentuan ini, silakan hubungi kami melalui email di:{' '}
              <a href="mailto:terms@notula.ai" className="text-blue-600 hover:underline">terms@notula.ai</a>
            </p>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p>
                Dengan menggunakan layanan Notula.ai, Anda mengakui bahwa Anda telah membaca, memahami, dan setuju untuk terikat
                oleh Syarat dan Ketentuan ini.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 