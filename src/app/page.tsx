import ImageResizer from "../components/ImageResizer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full max-w-4xl flex flex-col gap-8 items-center">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Batch Image Tool
          </h1>
          <p className="text-gray-400">
            Resize, crop, and convert multiple images at once.
          </p>
        </div>

        <ImageResizer />

        <footer className="text-xs text-gray-600 mt-8">
          <p>Processing happens entirely in your browser. No files are uploaded.</p>
        </footer>
      </main>
    </div>
  );
}
