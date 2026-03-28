import { X, User, FileText, Download, Loader2, Plus, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

type GuestDetailsModalProps = {
    guest: any;
    onClose: () => void;
    onUpdate?: () => void;
    readonly?: boolean;
    eventName?: string;
    eventDate?: string;
};

export default function GuestDetailsModal({ guest, onClose, onUpdate, readonly, eventName, eventDate }: GuestDetailsModalProps) {
    const [downloading, setDownloading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [addingLoader, setAddingLoader] = useState(false);
    const [coordinatorName, setCoordinatorName] = useState<string | null>(null);

    useEffect(() => {
        if (guest?.coordinator_id) {
            const fetchCoord = async () => {
                const { data } = await supabase
                    .from('coordinators')
                    .select('name')
                    .eq('id', guest.coordinator_id)
                    .single();
                if (data) setCoordinatorName(data.name);
            };
            fetchCoord();
        }
    }, [guest?.coordinator_id]);

    // New Member State
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberIdType, setNewMemberIdType] = useState("Aadhar Card");
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);

    if (!guest) return null;

    const attendees = guest.attendees_data || [];

    const getNormalizedImage = (url: string): Promise<{ base64: string; width: number; height: number; ratio: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Handle CORS
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const base64 = canvas.toDataURL("image/jpeg", 0.95); // Convert to JPEG with good quality
                resolve({
                    base64,
                    width: img.width,
                    height: img.height,
                    ratio: img.width / img.height
                });
            };
            img.onerror = (err) => reject(err);
        });
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim()) {
            alert("Please enter a member name.");
            return;
        }

        try {
            setAddingLoader(true);
            let frontUrl = "";
            let backUrl = "";

            // Upload Front ID
            if (frontFile) {
                const fileExt = frontFile.name.split('.').pop();
                const fileName = `${guest.id}/${Date.now()}_front.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('guest-ids')
                    .upload(fileName, frontFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('guest-ids')
                    .getPublicUrl(fileName);

                frontUrl = publicUrl;
            }

            // Upload Back ID
            if (backFile) {
                const fileExt = backFile.name.split('.').pop();
                const fileName = `${guest.id}/${Date.now()}_back.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('guest-ids')
                    .upload(fileName, backFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('guest-ids')
                    .getPublicUrl(fileName);

                backUrl = publicUrl;
            }

            const newMember = {
                name: newMemberName,
                id_type: newMemberIdType,
                id_front: frontUrl,
                id_back: backUrl
            };

            const updatedAttendees = [...(guest.attendees_data || []), newMember];

            const { error } = await supabase
                .from('guests')
                .update({
                    attendees_data: updatedAttendees,
                    attending_count: (guest.attending_count || 1) + 1 // Optional: depending on if we want to incr count
                    // Actually, let's keep it safe and just update array. User might not want to affect count if it's strict.
                    // But usually adding a member means +1. Let's act like user flow.
                })
                .eq('id', guest.id);

            if (error) throw error;

            alert("Member added successfully!");
            setIsAdding(false);
            setNewMemberName("");
            setFrontFile(null);
            setBackFile(null);
            if (onUpdate) onUpdate();

        } catch (error: any) {
            console.error("Error adding member:", error);
            alert("Failed to add member: " + error.message);
        } finally {
            setAddingLoader(false);
        }
    };


    const handleDeleteMember = async (index: number) => {
        if (!confirm("Are you sure you want to delete this member? This cannot be undone.")) return;

        try {
            const updatedAttendees = [...(guest.attendees_data || [])];
            updatedAttendees.splice(index, 1);

            const { error } = await supabase
                .from('guests')
                .update({
                    attendees_data: updatedAttendees,
                    attending_count: Math.max((guest.attending_count || 1) - 1, 0)
                })
                .eq('id', guest.id);

            if (error) throw error;

            alert("Member deleted successfully.");
            if (onUpdate) onUpdate();

        } catch (error: any) {
            console.error("Error deleting member:", error);
            alert("Failed to delete member: " + error.message);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true);
            const doc = new jsPDF();
            let yPos = 20;

            // Title
            doc.setFontSize(20);
            doc.text(guest.name, 20, yPos);

            // Event Details (Top Right)
            if (eventName) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.text(eventName, pageWidth - 20, 20, { align: "right" });
                if (eventDate) {
                    doc.text(format(new Date(eventDate), "MMMM d, yyyy"), pageWidth - 20, 26, { align: "right" });
                }

                // Transport details removed from PDF layout
                doc.setTextColor(0);
            }

            yPos += 10;

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text("Guest Details & Documents", 20, yPos);
            yPos += 20;

            // Main Details
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Email: ${guest.email || "-"}`, 20, yPos);
            yPos += 7;
            doc.text(`Phone: ${guest.phone || "-"}`, 20, yPos);
            yPos += 7;
            doc.text(`Status: ${guest.status}`, 20, yPos);
            yPos += 7;
            doc.text(`Total Guests: ${attendees.length > 0 ? attendees.length : guest.attending_count}`, 20, yPos);
            yPos += 15;

            // Travel Details block removed from here as it is now on the right side

            // Message section removed from PDF layout

            // Attendees
            doc.setFontSize(14);
            doc.text("Family Members & IDs", 20, yPos);
            yPos += 10;

            for (let i = 0; i < attendees.length; i++) {
                const attendee = attendees[i];

                // Check page break for text
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(12);
                doc.text(`${attendee.name}${attendee.age ? `, Age: ${attendee.age}` : ''} (${attendee.id_type || "No Type"})`, 20, yPos);
                yPos += 10;

                // Images
                const imagesToAdd = [];
                if (attendee.id_front) imagesToAdd.push({ label: "Front ID", url: attendee.id_front });
                if (attendee.id_back) imagesToAdd.push({ label: "Back ID", url: attendee.id_back });

                if (imagesToAdd.length > 0) {
                    for (const img of imagesToAdd) {
                        try {
                            doc.setFontSize(10);
                            doc.setTextColor(100);

                            // Check specific space for label only first
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(img.label, 20, yPos);
                            yPos += 5;

                            const { base64, width, height, ratio } = await getNormalizedImage(img.url);

                            // Calculate Dimensions — use full usable page width (A4 = 210mm, 20mm margins each side)
                            const maxWidth = 170; // mm
                            const maxHeight = 240; // mm

                            let imgWidth = maxWidth;
                            let imgHeight = maxWidth / ratio;

                            // If height exceeds max, scale by height instead
                            if (imgHeight > maxHeight) {
                                imgHeight = maxHeight;
                                imgWidth = imgHeight * ratio;
                            }

                            // Check page break for image
                            if (yPos + imgHeight > 280) {
                                doc.addPage();
                                yPos = 20;
                                // Reprint label since we moved to new page
                                doc.text(`${img.label} (cont.)`, 20, yPos);
                                yPos += 5;
                            }

                            doc.addImage(base64, "JPEG", 20, yPos, imgWidth, imgHeight);
                            yPos += imgHeight + 10;
                        } catch (err) {
                            console.error("Error loading image for PDF", err);
                            doc.text(`[Error loading image: ${img.label}]`, 20, yPos);
                            yPos += 10;
                        }
                    }
                } else {
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text("No documents uploaded.", 20, yPos);
                    yPos += 10;
                }

                yPos += 10; // Space between attendees
                doc.setTextColor(0);
            }

            doc.save(`${guest.name.replace(/\s+/g, "_")}_Details.pdf`);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div
                className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-8 md:p-10 border-b border-zinc-100 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{guest.name}</h2>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest 
                                ${guest.status === 'accepted' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                                    guest.status === 'declined' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                                        'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'}`}>
                                {guest.status}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            Comprehensive dossier for event attendee
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl w-12 h-12 hover:bg-rose-500/10 hover:text-rose-600 transition-all">
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 overflow-y-auto space-y-12">
                    {/* Main Guest Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2 p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">Communication</span>
                            <div className="space-y-1">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{guest.email || "No Email Provided"}</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{guest.phone || "No Phone Provided"}</span>
                            </div>
                        </div>
                        <div className="space-y-2 p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">Attendance</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{attendees.length > 0 ? attendees.length : guest.attending_count}</span>
                                <span className="text-sm font-bold text-zinc-500 tracking-tight">Confirmed Members</span>
                            </div>
                        </div>
                        {coordinatorName && (
                            <div className="space-y-2 p-6 rounded-3xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 block">Acquisition Source</span>
                                <span className="font-black text-zinc-900 dark:text-zinc-100 block">Coordinated by {coordinatorName}</span>
                            </div>
                        )}
                    </div>

                    {/* Transport Details (Arrival & Departure) */}
                    {guest.departure_details?.applicable !== false && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Arrival Section */}
                            {guest.departure_details?.arrival?.date && (
                                <div className="bg-blue-500 dark:bg-blue-600 rounded-[2rem] p-8 text-white space-y-6 shadow-2xl shadow-blue-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Arrival Manifest</span>
                                            <h3 className="text-2xl font-black tracking-tight">Entry Point</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black">{format(new Date(guest.departure_details.arrival.date), "MMM d")}</p>
                                            <p className="text-xs font-bold opacity-60 uppercase">{guest.departure_details.arrival.time || "TBD"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {guest.departure_details.arrival.travelers?.map((t: any, i: number) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-sm space-y-2">
                                                <div className="flex items-center justify-between font-black uppercase text-[10px]">
                                                    <span className="tracking-widest">{t.name || `Traveler ${i + 1}`}</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-white text-blue-600">{t.mode_of_travel}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                                                    <div>
                                                        <span className="opacity-60 block uppercase text-[8px] font-black mb-0.5">Terminal</span>
                                                        {t.station_airport}
                                                    </div>
                                                    <div>
                                                        <span className="opacity-60 block uppercase text-[8px] font-black mb-0.5">Contact</span>
                                                        {t.contact_number || "N/A"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Departure Section */}
                            {guest.departure_details?.departure?.date && (
                                <div className="bg-zinc-900 dark:bg-white rounded-[2rem] p-8 text-white dark:text-zinc-900 space-y-6 shadow-2xl shadow-zinc-900/10">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Departure Manifest</span>
                                            <h3 className="text-2xl font-black tracking-tight">Exit Point</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black">{format(new Date(guest.departure_details.departure.date), "MMM d")}</p>
                                            <p className="text-xs font-bold opacity-60 uppercase">{guest.departure_details.departure.time || "TBD"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {guest.departure_details.departure.travelers?.map((t: any, i: number) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/5 dark:bg-zinc-500/5 backdrop-blur-md border border-white/10 dark:border-zinc-500/10 text-sm space-y-2">
                                                <div className="flex items-center justify-between font-black uppercase text-[10px]">
                                                    <span className="tracking-widest">{t.name || `Traveler ${i + 1}`}</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white uppercase tracking-tighter">{t.mode_of_travel}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                                                    <div>
                                                        <span className="opacity-60 block uppercase text-[8px] font-black mb-0.5">Station</span>
                                                        {t.station_airport}
                                                    </div>
                                                    <div>
                                                        <span className="opacity-60 block uppercase text-[8px] font-black mb-0.5">Contact</span>
                                                        {t.contact_number || "N/A"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages */}
                    {(guest.message || guest.dietary_requirements) && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                            {guest.message && (
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Message</span>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{guest.message}</p>
                                </div>
                            )}
                            {guest.dietary_requirements && ( // Keeping for legacy records even if field removed from UI
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dietary Requirements</span>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{guest.dietary_requirements}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendees & IDs */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Family Members & IDs
                            </h3>
                            {!readonly && (
                                <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Member
                                </Button>
                            )}
                        </div>

                        {/* Add Member Form */}
                        {isAdding && !readonly && (
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            placeholder="Enter name"
                                            value={newMemberName}
                                            onChange={(e) => setNewMemberName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ID Type</Label>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
                                            value={newMemberIdType}
                                            onChange={(e) => setNewMemberIdType(e.target.value)}
                                        >
                                            <option value="Aadhar Card">Aadhar Card</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Pan Card">Pan Card</option>
                                            <option value="Driving License">Driving License</option>
                                            <option value="Voter ID">Voter ID</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Front ID</Label>
                                        <Input type="file" onChange={(e) => setFrontFile(e.target.files?.[0] || null)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Back ID</Label>
                                        <Input type="file" onChange={(e) => setBackFile(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleAddMember} disabled={addingLoader}>
                                        {addingLoader ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        Save Member
                                    </Button>
                                </div>
                            </div>
                        )}

                        {attendees.length === 0 ? (
                            <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl text-zinc-500 text-sm">
                                No detailed attendee data available.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {attendees.map((attendee: any, idx: number) => (
                                    <div key={idx} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{attendee.name}</p>
                                                <p className="text-xs text-zinc-500">{attendee.id_type || "ID Type Not Specified"}{attendee.age ? ` · Age: ${attendee.age}` : ""}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-zinc-400">#{idx + 1}</span>
                                                {!readonly && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDeleteMember(idx)}
                                                        title="Delete Member"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Front ID */}
                                            <div className="space-y-2">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Front Side
                                                </span>
                                                {attendee.id_front ? (
                                                    <a href={attendee.id_front} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 aspect-video">
                                                        <img src={attendee.id_front} alt="ID Front" className="object-cover w-full h-full" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                                            View Full Size
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <div className="aspect-video rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 text-xs">
                                                        Not Uploaded
                                                    </div>
                                                )}
                                            </div>

                                            {/* Back ID */}
                                            <div className="space-y-2">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Back Side
                                                </span>
                                                {attendee.id_back ? (
                                                    <a href={attendee.id_back} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 aspect-video">
                                                        <img src={attendee.id_back} alt="ID Back" className="object-cover w-full h-full" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                                            View Full Size
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <div className="aspect-video rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 text-xs">
                                                        Not Uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 md:p-10 border-t border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row justify-end gap-3">
                    <Button 
                        variant="ghost" 
                        className="h-14 rounded-full px-8 font-black text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all border border-zinc-200 dark:border-white/10"
                        onClick={handleDownloadPDF} 
                        disabled={downloading}
                    >
                        {downloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                        Export PDF Dossier
                    </Button>
                    <Button 
                        className="h-14 rounded-full px-12 font-black bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                        onClick={onClose}
                    >
                        Close Portal
                    </Button>
                </div>
            </div>
        </div>
    );
}
