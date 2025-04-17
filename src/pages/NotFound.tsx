import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-blue-700">404</h1>
      <p className="mt-2 text-2xl font-semibold text-gray-900">Halaman tidak ditemukan</p>
      <p className="mt-4 text-lg text-gray-700 font-medium">
        Maaf, halaman yang Anda cari tidak ada.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base font-semibold"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
