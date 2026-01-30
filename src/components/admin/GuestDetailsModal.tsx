import { X, User, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type GuestDetailsModalProps = {
    guest: any;
    onClose: () => void;
};

export default function GuestDetailsModal({ guest, onClose }: GuestDetailsModalProps) {
    if (!guest) return null;

    const attendees = guest.attendees_data || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{guest.name}</h2>
                        <p className="text-sm text-zinc-500">Guest Details & Documents</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Main Guest Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-zinc-500 block">Email</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{guest.email || "-"}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-zinc-500 block">Phone</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{guest.phone || "-"}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-zinc-500 block">Status</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize 
                                ${guest.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    guest.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                {guest.status}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-zinc-500 block">Total Guests</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{attendees.length > 0 ? attendees.length : guest.attending_count}</span>
                        </div>
                    </div>

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
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Family Members & IDs
                        </h3>

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
                                                <p className="text-xs text-zinc-500">{attendee.id_type || "ID Type Not Specified"}</p>
                                            </div>
                                            <span className="text-xs font-mono text-zinc-400">#{idx + 1}</span>
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
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}
