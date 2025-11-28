"use client";

import { useState, useRef, useCallback } from "react";
import { ZipWriter } from "../utils/zipWriter";
import { loadBitmap, renderToSquare, pickExtFromMime } from "../utils/imageProcessor";

export default function ImageResizer() {
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<string>("");
    const [progress, setProgress] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Settings
    const [format, setFormat] = useState("image/jpeg");
    const [quality, setQuality] = useState(0.8);
    const [width, setWidth] = useState(1500);
    const [height, setHeight] = useState(1500);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (newFiles: File[]) => {
        const imgs = newFiles.filter((f) => f.type.startsWith("image/"));
        setFiles((prev) => [...prev, ...imgs]);
    };

    const clearFiles = () => {
        setFiles([]);
        setStatus("");
        setProgress(0);
    };

    const runBatch = async () => {
        if (!files.length) return;

        setIsProcessing(true);
        setStatus(`Processing ${files.length} images...`);
        setProgress(0);

        const zip = new ZipWriter();
        const concurrency = 3;
        let completed = 0;

        const processFile = async (file: File, index: number) => {
            const base = file.name.replace(/\.[^/.]+$/, "");
            try {
                const bmp = await loadBitmap(file);
                const blob = await renderToSquare(bmp, width, height, format, quality);

                const ext =
                    pickExtFromMime(format) ||
                    (file.type ? pickExtFromMime(file.type) : null) ||
                    "jpg";

                const u8 = new Uint8Array(await blob.arrayBuffer());
                zip.addFile(`${base}.${ext}`, u8);

                completed++;
                setProgress(Math.round((completed / files.length) * 100));
                setStatus(`${completed}/${files.length} Done: ${base}.${ext}`);
            } catch (e: any) {
                console.error(e);
                setStatus(`Error (${index + 1}/${files.length}): ${file.name} - ${e.message}`);
            }
        };

        // Simple concurrency control
        const chunks = [];
        for (let i = 0; i < files.length; i += concurrency) {
            chunks.push(files.slice(i, i + concurrency).map((f, idx) => ({ file: f, index: i + idx })));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(({ file, index }) => processFile(file, index)));
        }

        const zipBlob = zip.build();
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch_cropped_${width}x${height}_${Date.now()}.zip`;
        a.click();

        setStatus("Done! ZIP download started.");
        setIsProcessing(false);
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 text-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Batch Image Resizer & Zipper</h2>

            {/* Drop Zone */}
            <div
                className={`relative w-full min-h-[200px] flex flex-col justify-center items-center text-center p-4 rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${dragActive
                        ? "bg-gray-700 border-gray-400 text-gray-100"
                        : "bg-gray-750 border-gray-600 text-gray-400 hover:bg-gray-700"
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleChange}
                />
                <p className="text-lg font-medium">Drag & Drop images here or click to select</p>
                <p className="text-sm mt-2 opacity-70">Supports JPG, PNG, WebP, AVIF</p>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Output Format</label>
                    <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="image/jpeg">JPEG (Universal)</option>
                        <option value="image/png">PNG (Transparent)</option>
                        <option value="image/webp">WebP (Recommended)</option>
                        <option value="image/avif">AVIF (High Compression)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Quality (0.1 - 1.0)</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="1"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Width (px)</label>
                    <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Height (px)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* File List */}
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-400">
                        {files.length > 0 ? `${files.length} files selected` : "No files selected"}
                    </span>
                    {files.length > 0 && (
                        <button
                            onClick={clearFiles}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-48 overflow-y-auto">
                    {files.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-2">List is empty</p>
                    ) : (
                        <ul className="space-y-1">
                            {files.map((f, i) => (
                                <li key={i} className="text-sm text-gray-300 truncate">
                                    {i + 1}. {f.name} <span className="text-gray-500">({Math.round(f.size / 1024)} KB)</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-4">
                <button
                    onClick={runBatch}
                    disabled={files.length === 0 || isProcessing}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${files.length === 0 || isProcessing
                            ? "bg-gray-600 cursor-not-allowed opacity-50"
                            : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30"
                        }`}
                >
                    {isProcessing ? "Processing..." : "Start Batch Processing"}
                </button>

                {/* Status & Progress */}
                {(status || isProcessing) && (
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-center text-gray-300 mt-2">{status}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
