"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import withAuth from "@/components/auth/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, 
    ArrowLeft, 
    Upload, 
    Download, 
    Trash2, 
    Search, 
    UserPlus, 
    Eye,
    Copy,
    Link as LinkIcon,
    Hotel,
    MapPin,
    Users,
    Check,
    Pencil,
    X,
    MessageCircle,
    Smartphone,
    SmartphoneNfc,
    SmartphoneCharging,
    MessageSquare,
    MessageSquareOff,
    CheckCircle2,
    ChevronDown
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import GuestDetailsModal from "@/components/admin/GuestDetailsModal";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/useToast";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    slug: string;
    assigned_hotel_email?: string;
    assigned_hotel_name?: string;
    drop_locations?: string[];
    is_whatsapp_enabled?: boolean;
};

type Guest = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    arrival_location: string | null;
    arrival_date: string | null;
    departure_location: string | null;
    departure_date: string | null;
    allowed_guests: number;
    status: "pending" | "accepted" | "declined";
    attending_count: number;
    attendees_data?: any[];
    departure_details?: {
        applicable?: boolean;
        arrival?: {
            date?: string;
            time?: string;
            travelers?: Array<{
                name: string;
                mode_of_travel: string;
                transport_number?: string;
                station_airport?: string;
                contact_number?: string;
                number_of_pax?: string;
                number_of_bags?: string;
                drop_location?: string;
                number_of_vehicles?: string;
                ticket_url?: string;
            }>;
        };
        departure?: {
            date?: string;
            time?: string;
            travelers?: Array<{
                name: string;
                mode_of_travel: string;
                transport_number?: string;
                station_airport?: string;
                contact_number?: string;
                number_of_pax?: string;
                number_of_bags?: string;
                drop_location?: string;
                number_of_vehicles?: string;
                ticket_url?: string;
            }>;
        };
        transport_number?: string;
        message?: string;
        // Legacy fields for backward compatibility
        arrival_date?: string;
        arrival_time?: string;
        arrival_location?: string;
        arrival_mode?: string;
        departure_date?: string;
        departure_time?: string;
        departure_location?: string;
        departure_mode?: string;
        travelers?: any[];
    };
    coordinator_id?: string | null;
    parent_id?: string | null;
};

function EventDetails() {
    const params = useParams();


    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [coordinators, setCoordinators] = useState<Record<string, string>>({});
    const [allHotels, setAllHotels] = useState<{ name: string; email: string }[]>([]);
    const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"guests" | "arrival" | "departure">("guests");
    const [selectedPrimaryGuestId, setSelectedPrimaryGuestId] = useState<string | null>(null);

    const [showHotelModal, setShowHotelModal] = useState(false);
    const [hotelEmail, setHotelEmail] = useState("");
    const [hotelName, setHotelName] = useState("");
    const [assignLoading, setAssignLoading] = useState(false);

    // Drop Locations Management State
    const [showDropLocationsModal, setShowDropLocationsModal] = useState(false);
    const [dropLocationsText, setDropLocationsText] = useState("");
    const [dropLocationsLoading, setDropLocationsLoading] = useState(false);

    // Add Guest Modal State
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestEmail, setNewGuestEmail] = useState("");
    const [newGuestPhone, setNewGuestPhone] = useState("");
    const [addGuestLoading, setAddGuestLoading] = useState(false);
    
    // Name Editing State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editableName, setEditableName] = useState("");
    const [nameUpdateLoading, setNameUpdateLoading] = useState(false);
    const [whatsappUpdateLoading, setWhatsappUpdateLoading] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState<Record<string, boolean>>({});
    const [sendingAllWhatsApp, setSendingAllWhatsApp] = useState(false);
    const [showNameUpdateModal, setShowNameUpdateModal] = useState(false);
    const [nameUpdatePassword, setNameUpdatePassword] = useState("");
    const [isCopyingRsvp, setIsCopyingRsvp] = useState(false);
    const [isCopyingInvite, setIsCopyingInvite] = useState(false);

    const eventId = params.id as string;

    useEffect(() => {
        fetchEventData();
    }, [eventId]);

    const fetchEventData = async () => {
        try {
            // Fetch Event
            const { data: eventData, error: eventError } = await supabase
                .from("events")
                .select("*")
                .eq("id", eventId)
                .single();

            if (eventError) throw eventError;
            setEvent(eventData);
            setHotelEmail(eventData.assigned_hotel_email || "");
            setHotelName(eventData.assigned_hotel_name || "");
            setDropLocationsText(eventData.drop_locations?.join(", ") || "");
            setEditableName(eventData.name || "");

            // Fetch Guests
            const { data: guestData, error: guestError } = await supabase
                .from("guests")
                .select("*")
                .eq("event_id", eventId)
                .order("name", { ascending: true });

            if (guestError) throw guestError;
            setGuests(guestData || []);

            // Fetch Coordinators for attribution
            const { data: coordData } = await supabase
                .from("coordinators")
                .select("id, name");
            
            if (coordData) {
                const coordMap = coordData.reduce((acc: Record<string, string>, curr: any) => {
                    acc[curr.id] = curr.name;
                    return acc;
                }, {});
                setCoordinators(coordMap);
            }

            // Fetch All Hotels for the dropdown
            const { data: hotelsData } = await supabase
                .from("hotels")
                .select("name, email")
                .order("name");
            
            if (hotelsData) {
                setAllHotels(hotelsData);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignHotel = async () => {
        setAssignLoading(true);
        try {
            const { error } = await supabase
                .from("events")
                .update({
                    assigned_hotel_email: hotelEmail,
                    assigned_hotel_name: hotelName
                })
                .eq("id", eventId);

            if (error) throw error;

            setEvent(prev => prev ? ({ ...prev, assigned_hotel_email: hotelEmail, assigned_hotel_name: hotelName }) : null);
            setShowHotelModal(false);
            toast.success("Hotel assigned successfully.");
        } catch (error: any) {
            toast.error("Error assigning hotel: " + error.message);
        } finally {
            setAssignLoading(false);
        }
    };

    const handleUpdateDropLocations = async () => {
        setDropLocationsLoading(true);
        try {
            const locations = dropLocationsText.split(',').map(s => s.trim()).filter(s => s !== "");
            const { error } = await supabase
                .from("events")
                .update({ drop_locations: locations })
                .eq("id", eventId);

            if (error) throw error;

            setEvent(prev => prev ? ({ ...prev, drop_locations: locations }) : null);
            setShowDropLocationsModal(false);
            toast.success("Drop locations updated successfully.");
        } catch (error: any) {
            toast.error("Error updating drop locations: " + error.message);
        } finally {
            setDropLocationsLoading(false);
        }
    };

    const handleUpdateName = () => {
        if (!editableName.trim()) return;
        setShowNameUpdateModal(true);
    };

    const executeUpdateName = async () => {
        if (!nameUpdatePassword) {
            toast.warning("Please enter your password to confirm.");
            return;
        }

        setNameUpdateLoading(true);
        try {
            // Verify Password
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: nameUpdatePassword
            });

            if (authError) throw new Error("Incorrect password. Please try again.");

            const newSlug = editableName.trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

            const { error } = await supabase
                .from("events")
                .update({ 
                    name: editableName.trim(),
                    slug: newSlug
                })
                .eq("id", eventId);

            if (error) throw error;

            setEvent(prev => prev ? ({ ...prev, name: editableName.trim(), slug: newSlug }) : null);
            setIsEditingName(false);
            setShowNameUpdateModal(false);
            setNameUpdatePassword("");
            toast.success("Event name and slug updated successfully.");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setNameUpdateLoading(false);
        }
    };

    const handleToggleWhatsApp = async () => {
        if (!event) return;
        setWhatsappUpdateLoading(true);
        try {
            const nextStatus = !event.is_whatsapp_enabled;
            const { error } = await supabase
                .from("events")
                .update({ is_whatsapp_enabled: nextStatus })
                .eq("id", eventId);

            if (error) throw error;
            setEvent(prev => prev ? ({ ...prev, is_whatsapp_enabled: nextStatus }) : null);
            toast.success(`WhatsApp invites ${nextStatus ? 'enabled' : 'disabled'} successfully.`);
        } catch (error: any) {
            toast.error("Error updating WhatsApp preference: " + error.message);
        } finally {
            setWhatsappUpdateLoading(false);
        }
    };

    const handleSendIndividualWhatsApp = async (guest: any) => {
        if (!guest.phone) {
            toast.warning("This guest does not have a phone number.");
            return;
        }

        if (!event) {
            toast.error("Event data not loaded.");
            return;
        }

        setSendingWhatsApp(prev => ({ ...prev, [guest.id]: true }));
        try {
            const response = await fetch('/api/whatsapp/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guests: [guest],
                    event: event
                })
            });

            const result = await response.json();
            if (response.ok) {
                if (result.successes > 0) {
                    toast.success("WhatsApp invitation sent successfully!");
                } else if (result.errors && result.errors.length > 0) {
                    toast.error(`Failed to send WhatsApp:\n- ${result.errors.join('\n- ')}`);
                } else {
                    toast.warning("WhatsApp invitation failed. Please check the logs.");
                }
            } else {
                toast.error(`Error: ${result.error || "Failed to send WhatsApp"}`);
            }
        } catch (error: any) {
            toast.error("Failed to trigger WhatsApp invite: " + error.message);
        } finally {
            setSendingWhatsApp(prev => ({ ...prev, [guest.id]: false }));
        }
    };

    const handleSendAllInvites = async () => {
        if (!event) return;
        
        const guestsWithPhone = guests.filter(g => g.phone);
        if (guestsWithPhone.length === 0) {
            toast.info("No guests with phone numbers found.");
            return;
        }

        const confirmed = await toast.confirm("Bulk Invitation", `Are you sure you want to send WhatsApp invitations to all ${guestsWithPhone.length} guests?`);
        if (!confirmed) return;

        setSendingAllWhatsApp(true);
        try {
            const response = await fetch('/api/whatsapp/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guests: guestsWithPhone,
                    event: event
                })
            });

            const result = await response.json();
            if (response.ok) {
                let statusMsg = `Bulk WhatsApp Status: ${result.message}`;
                if (result.errors && result.errors.length > 0) {
                    statusMsg += `\n\nErrors:\n- ${result.errors.join('\n- ')}`;
                }
                toast.alert("Bulk WhatsApp Summary", statusMsg, result.failures > 0 ? "warning" : "success");
            } else {
                toast.error(`Error: ${result.error || "Failed to send bulk WhatsApp"}`);
            }
        } catch (error: any) {
            toast.error("Failed to trigger bulk WhatsApp invites: " + error.message);
        } finally {
            setSendingAllWhatsApp(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsedGuests = results.data.map((row: any) => {
                        // Helper to find value case-insensitively
                        const getValue = (keys: string[]) => {
                            const rowKeys = Object.keys(row);
                            for (const key of rowKeys) {
                                if (keys.includes(key.trim().toLowerCase())) {
                                    return row[key];
                                }
                            }
                            return null;
                        };

                        const name = getValue(["name", "full name", "guest name", "primary guest", "guest"]);
                        const email = getValue(["email", "e-mail", "mail", "email address"]);
                        const phone = getValue(["phone", "mobile", "contact", "cell", "phone number", "mobile number", "contact number", "mobile no", "phone no"]);
                        const guests = getValue(["guests", "guest", "allowed", "count", "number of guests", "additional guests", "no of guests"]);

                        return {
                            event_id: eventId,
                            name: name,
                            email: email,
                            phone: phone,
                            allowed_guests: parseInt(guests || "1"),
                            status: "pending",
                        };
                    }).filter((g: any) => g.name && g.name.trim() !== "");

                    if (parsedGuests.length === 0) {
                        toast.warning("No valid guests found in CSV. Please ensure there is a 'Name' column.");
                        return;
                    }

                    const { error } = await supabase.from("guests").insert(parsedGuests);
                    if (error) throw error;

                    toast.success(`Successfully imported ${parsedGuests.length} guests.`);
                    
                    // Trigger WhatsApp Invites only if enabled for this event
                    const confirmed = await toast.confirm("Send Invites", `Do you want to send WhatsApp invites to the ${parsedGuests.length} newly imported guests?`);
                    if (event?.is_whatsapp_enabled && confirmed) {
                        try {
                            const response = await fetch('/api/whatsapp/invite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    guests: parsedGuests,
                                    event: event
                                })
                            });
                            const result = await response.json();
                            if (response.ok) {
                                let statusMsg = `WhatsApp Invitation Status: ${result.message}`;
                                if (result.errors && result.errors.length > 0) {
                                    statusMsg += `\n\nErrors:\n- ${result.errors.join('\n- ')}`;
                                }
                                toast.info(statusMsg);
                            } else {
                                console.error("WhatsApp Invite Error:", result.error);
                            }
                        } catch (error) {
                            console.error("Failed to trigger WhatsApp invites:", error);
                        }
                    }

                    fetchEventData(); // Refresh list
                } catch (error: any) {
                    toast.error("Error importing guests: " + error.message);
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            },
            error: (error) => {
                toast.error("CSV Parse Error: " + error.message);
                setUploading(false);
            }
        });
    };

    const handleAddGuest = async () => {
        if (!newGuestName.trim()) {
            toast.warning("Please enter a guest name.");
            return;
        }

        setAddGuestLoading(true);
        try {
            const { error } = await supabase.from("guests").insert([{
                event_id: eventId,
                name: newGuestName,
                email: newGuestEmail || null,
                phone: newGuestPhone || null,
                parent_id: selectedPrimaryGuestId,
                allowed_guests: 1,
                status: "pending",
            }]);

            if (error) throw error;

            toast.success("Guest added successfully!");
            setShowAddGuestModal(false);
            setNewGuestName("");
            setNewGuestEmail("");
            setNewGuestPhone("");
            setSelectedPrimaryGuestId(null);
            fetchEventData(); // Refresh list
        } catch (error: any) {
            toast.error("Error adding guest: " + error.message);
        } finally {
            setAddGuestLoading(false);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Guest delete state
    const [guestToDelete, setGuestToDelete] = useState<any | null>(null);
    const [showGuestDeleteModal, setShowGuestDeleteModal] = useState(false);
    const [guestDeletePassword, setGuestDeletePassword] = useState("");
    const [guestDeleteLoading, setGuestDeleteLoading] = useState(false);

    const handleDeleteGuest = (guest: any) => {
        setGuestToDelete(guest);
        setGuestDeletePassword("");
        setShowGuestDeleteModal(true);
    };

    const executeDeleteGuest = async () => {
        if (!guestDeletePassword) {
            toast.warning("Please enter your password to confirm.");
            return;
        }
        if (!guestToDelete) return;

        setGuestDeleteLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: guestDeletePassword,
            });
            if (authError) throw new Error("Incorrect password. Please try again.");

            // Case 1: Internal Companion (JSON-based)
            if (!guestToDelete.isPrimary && !guestToDelete.isLinkedGuest) {
                // Fetch current primary guest to get latest attendees_data
                const { data: primaryGuest, error: fetchError } = await supabase
                    .from("guests")
                    .select("attendees_data")
                    .eq("id", guestToDelete.id)
                    .single();
                
                if (fetchError) throw fetchError;

                const currentAttendees = primaryGuest.attendees_data || [];
                const updatedAttendees = currentAttendees.filter((m: any) => m.name !== guestToDelete.actualName);

                const { error: updateError } = await supabase
                    .from("guests")
                    .update({
                        attendees_data: updatedAttendees,
                        attending_count: updatedAttendees.length > 0 ? updatedAttendees.length + (guestToDelete.status === 'accepted' ? 1 : 0) : 1
                    })
                    .eq("id", guestToDelete.id);
                
                if (updateError) throw updateError;
                toast.success(`Companion "${guestToDelete.actualName}" removed.`);
            } 
            // Case 2: Linked Companion (Separate row)
            else if (guestToDelete.isLinkedGuest) {
                const { error: deleteError } = await supabase
                    .from("guests")
                    .delete()
                    .eq("id", guestToDelete.id);
                
                if (deleteError) throw deleteError;
                toast.success(`Companion "${guestToDelete.actualName}" deleted.`);
            }
            // Case 3: Primary Guest (Original behavior)
            else {
                // Delete linked companions first
                await supabase.from("guests").delete().eq("parent_id", guestToDelete.id);
                
                // Delete primary guest
                const { error: primaryError } = await supabase
                    .from("guests")
                    .delete()
                    .eq("id", guestToDelete.id);
                
                if (primaryError) throw primaryError;
                toast.success("Guest and companions deleted successfully.");
            }

            setShowGuestDeleteModal(false);
            setGuestToDelete(null);
            setGuestDeletePassword("");
            fetchEventData(); // Refresh all stats and list
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setGuestDeleteLoading(false);
        }
    };

    const handleDeleteEvent = () => {
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!deletePassword) {
            toast.error("Please enter your password to confirm.");
            return;
        }

        setDeleteLoading(true);
        try {
            // Verify Password by attempting re-login
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: deletePassword
            });

            if (authError) {
                throw new Error("Incorrect password. Please try again.");
            }

            // Proceed with Deletion
            // 1. Delete associated guests first (or their deletion should be cascaded, but better to be safe)
            const { error: guestsError } = await supabase.from("guests").delete().eq("event_id", eventId);
            if (guestsError) throw guestsError;

            // 2. Unassign coordinators from this event (clears the foreign key constraint)
            const { error: coordError } = await supabase
                .from("coordinators")
                .update({ event_id: null })
                .eq("event_id", eventId);
            if (coordError) throw coordError;

            // 3. Finally delete the event
            const { error } = await supabase.from("events").delete().eq("id", eventId);
            if (error) throw error;

            router.push("/admin/dashboard");
        } catch (error: any) {
            toast.error(error.message);
            setDeleteLoading(false);
        }
    };

    const handleExport = () => {
        const csv = Papa.unparse(guests.map(g => ({
            Name: g.name,
            Email: g.email,
            Phone: g.phone,
            "Allowed Guests": g.allowed_guests,
            Status: g.status,
            "Attending Count": g.attending_count
        })));

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "guests"}_export.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportArrival = () => {
        const guestsWithArrival = guests.filter(g => g.departure_details?.arrival);
        const exportData = guestsWithArrival.flatMap(guest => {
            const arrival = guest.departure_details?.arrival;
            const travelers = arrival?.travelers || [];
            if (travelers.length === 0) return [];
            return travelers.map((traveler: any, idx: number) => ({
                "Main Guest": guest.name,
                "Traveler Name": idx === 0 ? traveler.name : `${traveler.name} (Companion of ${guest.name})`,
                "Arrival Date": arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") : "-",
                "Arrival Time": arrival?.time || "-",
                "Station/Airport": traveler.station_airport || "-",
                "Mode of Travel": traveler.mode_of_travel || "-",
                "Transport No": traveler.transport_number || "-",
                "Contact": traveler.contact_number || guest.phone || "-",
                "Pax": traveler.number_of_pax || "1",
                "Bags": traveler.number_of_bags || "0",
                "Vehicles": traveler.number_of_vehicles || "1",
                "Drop Location": traveler.drop_location || "-",
                "Ticket URL": traveler.ticket_url || "-"
            }));
        });
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "arrival"}_arrival_details.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportDeparture = () => {
        // Get all guests with departure details
        const guestsWithDeparture = guests.filter(g => g.departure_details?.departure);

        // Flatten data for export
        const exportData = guestsWithDeparture.flatMap(guest => {
            const departure = guest.departure_details?.departure;
            const travelers = departure?.travelers || [];

            if (travelers.length === 0) return [];

            return travelers.map((traveler: any, idx: number) => ({
                "Main Guest": guest.name,
                "Traveler Name": idx === 0 ? traveler.name : `${traveler.name} (Companion of ${guest.name})`,
                "Departure Date": departure?.date ? format(new Date(departure.date), "MMM d, yyyy") : "-",
                "Departure Time": departure?.time || "-",
                "Station/Airport": traveler.station_airport || "-",
                "Mode of Travel": traveler.mode_of_travel || "-",
                "Transport No": traveler.transport_number || "-",
                "Contact": traveler.contact_number || guest.phone || "-",
                "Pax": traveler.number_of_pax || "1",
                "Bags": traveler.number_of_bags || "0",
                "Vehicles": traveler.number_of_vehicles || "1",
                "Drop Location": traveler.drop_location || "-",
                "Ticket URL": traveler.ticket_url || "-"
            }));
        });

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.name || "departure"}_departure_details.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const template = [
            { name: "Sample Name", phone: "91XXXXXXXXXX", email: "sample@example.com" }
        ];
        const csv = Papa.unparse(template);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "guest_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Template downloaded successfully!");
    };

    const handleDeleteDepartureDetails = async (guestId: string) => {
        const confirmed = await toast.confirm("Delete Transport Details", "Are you sure you want to delete this guest's transport details?");
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from("guests")
                .update({ departure_details: null })
                .eq("id", guestId);

            if (error) throw error;

            // Refresh the guest list
            await fetchEventData();
            toast.success("Transport details deleted successfully.");
        } catch (error: any) {
            toast.error("Error deleting transport details: " + error.message);
        }
    };

    const filteredGuests = guests.filter((guest) =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guest.email && guest.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (guest.phone && guest.phone.includes(searchQuery))
    );

    const flattenedGuests = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const result: any[] = [];
        
        // Map to hold linked companions by their parent_id
        const linkedCompanionsMap: Record<string, Guest[]> = {};
        guests.forEach(g => {
            if (g.parent_id) {
                if (!linkedCompanionsMap[g.parent_id]) linkedCompanionsMap[g.parent_id] = [];
                linkedCompanionsMap[g.parent_id].push(g);
            }
        });

        guests.forEach(guest => {
            // Skip linked companions in the main loop
            if (guest.parent_id) return;

            const primaryEntry = {
                ...guest,
                isPrimary: true,
                displayName: guest.name,
                actualName: guest.name,
                uniqueKey: `primary-${guest.id}`
            };

            // 2a. Internal attendees_data companions (if any)
            const attendeeCompanions = (guest.attendees_data || []).map((m: any, i) => {
                if (m.name === guest.name) return null;
                return {
                    ...guest,
                    ...m,
                    isPrimary: false,
                    displayName: guest.name,
                    actualName: m.name,
                    uniqueKey: `companion-${guest.id}-${i}`,
                    isLinkedGuest: false
                };
            }).filter(Boolean);

            // 2b. Linked companions (separate rows in DB)
            const linkedCompanions = (linkedCompanionsMap[guest.id] || []).map((lg) => {
                return {
                    ...lg,
                    isPrimary: false,
                    displayName: guest.name,
                    actualName: lg.name,
                    uniqueKey: `linked-${lg.id}`,
                    isLinkedGuest: true
                };
            });

            const allCompanionEntries = [...attendeeCompanions, ...linkedCompanions];
            const totalGroupSize = 1 + allCompanionEntries.length;

            const primaryEntryWithStats = { ...primaryEntry, groupSize: totalGroupSize };
            const companionsWithStats = allCompanionEntries.map(c => ({ ...c, groupSize: totalGroupSize }));

            // Filter logic
            const matchesPrimary = 
                primaryEntry.name.toLowerCase().includes(query) ||
                (primaryEntry.email && primaryEntry.email.toLowerCase().includes(query)) ||
                (primaryEntry.phone && primaryEntry.phone.includes(query));

            const matchingCompanions = allCompanionEntries.filter(c => 
                c.actualName.toLowerCase().includes(query) ||
                (c.phone && c.phone.includes(query))
            );

            if (!query) {
                result.push(primaryEntryWithStats);
                result.push(...companionsWithStats);
            } else if (matchesPrimary) {
                result.push(primaryEntryWithStats);
                result.push(...companionsWithStats);
            } else if (matchingCompanions.length > 0) {
                result.push(...companionsWithStats.filter(c => 
                    matchingCompanions.some(mc => mc.uniqueKey === c.uniqueKey)
                ));
            }
        });

        return result;
    }, [guests, searchQuery]);

    const stats = useMemo(() => {
        // Total primary invitation records
        const invitationCount = guests.filter(g => !g.parent_id).length;

        // Total individuals (Primary + Companions) across all invitations
        const totalGuestsInvited = flattenedGuests.length;

        const acceptedCount = flattenedGuests.filter(g => g.status === "accepted").length;
        const declinedCount = flattenedGuests.filter(g => g.status === "declined").length;
        const pendingCount = flattenedGuests.filter(g => g.status === "pending").length;

        return {
            invitations: invitationCount,
            guests: totalGuestsInvited,
            accepted: acceptedCount,
            declined: declinedCount,
            pending: pendingCount,
        };
    }, [guests, flattenedGuests]);

    const handleGuestUpdate = async () => {
        await fetchEventData(); // Refresh list
        if (selectedGuest) {
            const { data } = await supabase.from('guests').select('*').eq('id', selectedGuest.id).single();
            if (data) setSelectedGuest(data);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div>
                        <Link href="/admin/dashboard" className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center mb-2 font-medium transition-colors">
                            <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                            Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-3 group">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 flex-1 max-w-xl">
                                    <Input
                                        value={editableName}
                                        onChange={(e) => setEditableName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleUpdateName();
                                            if (e.key === "Escape") setIsEditingName(false);
                                        }}
                                        className="h-11 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl px-4 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-black text-xl sm:text-2xl"
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            size="icon" 
                                            onClick={handleUpdateName} 
                                            disabled={nameUpdateLoading}
                                            className="h-11 w-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 transition-all shrink-0"
                                        >
                                            {nameUpdateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost"
                                            onClick={() => setIsEditingName(false)} 
                                            className="h-11 w-11 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                        {event?.name}
                                    </h1>
                                    <button 
                                        onClick={() => setIsEditingName(true)}
                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                                        title="Edit Event Name"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-medium">
                            {event && format(new Date(event.date), "MMMM d, yyyy • h:mm a")} | {event?.location}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                        <Button
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => {
                                const url = `${window.location.origin}/r/${event?.slug}`;
                                navigator.clipboard.writeText(url);
                                setIsCopyingInvite(true);
                                toast.success("Invite link copied!");
                                setTimeout(() => setIsCopyingInvite(false), 2000);
                            }}
                        >
                            {isCopyingInvite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span className="hidden sm:inline">{isCopyingInvite ? 'Copied' : 'Copy Invite Link'}</span>
                            <span className="sm:hidden">{isCopyingInvite ? 'Done' : 'Share'}</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-white/50 dark:bg-zinc-900/40 border-indigo-200 dark:border-indigo-500/20 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white transition-all shadow-sm"
                            onClick={() => {
                                const url = `${window.location.origin}/confirm/${event?.slug}`;
                                navigator.clipboard.writeText(url);
                                setIsCopyingRsvp(true);
                                toast.success("RSVP link copied!");
                                setTimeout(() => setIsCopyingRsvp(false), 2000);
                            }}
                        >
                            {isCopyingRsvp ? <CheckCircle2 className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                            <span className="hidden sm:inline">{isCopyingRsvp ? 'Copied' : 'Copy RSVP Link'}</span>
                            <span className="sm:hidden">{isCopyingRsvp ? 'Done' : 'RSVP'}</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleToggleWhatsApp}
                            disabled={whatsappUpdateLoading}
                            className={`rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 transition-all shadow-sm border ${
                                event?.is_whatsapp_enabled 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white' 
                                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white'
                            }`}
                        >
                            {whatsappUpdateLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : event?.is_whatsapp_enabled ? (
                                <MessageSquare className="h-4 w-4" />
                            ) : (
                                <MessageSquareOff className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">
                                WhatsApp: {event?.is_whatsapp_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => setShowHotelModal(true)}
                        >
                            <Hotel className="h-4 w-4" />
                            Hotel Access
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={() => setShowDropLocationsModal(true)}
                        >
                            <MapPin className="h-4 w-4" />
                            Drop Locations
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
                            onClick={handleExport}
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button 
                            onClick={handleDeleteEvent} 
                            className="bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white rounded-xl h-10 text-xs font-bold uppercase tracking-widest gap-2 border border-red-200 dark:border-red-900/30 shadow-none transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[
                        { label: "Guest Invited", value: stats.invitations, color: "text-blue-600", bg: "bg-blue-600/10", border: "border-blue-100 dark:border-blue-900/30" },
                        { label: "Total Invited", value: stats.guests, color: "text-zinc-600", bg: "bg-zinc-600/10", border: "border-zinc-100 dark:border-zinc-900/30" },
                        { label: "Approved Guests", value: stats.accepted, color: "text-emerald-600", bg: "bg-emerald-600/10", border: "border-emerald-100 dark:border-emerald-900/30" },
                        { label: "Declined RSVPs", value: stats.declined, color: "text-rose-600", bg: "bg-rose-600/10", border: "border-rose-100 dark:border-rose-900/30" },
                        { label: "Pending Response", value: stats.pending, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-100 dark:border-amber-900/30" },
                    ].map((stat) => (
                        <div key={stat.label} className={cn("p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border backdrop-blur-sm", stat.bg, stat.color, stat.border)}>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">{stat.label}</p>
                            <p className="text-4xl font-black tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 bg-white/40 dark:bg-white/5 p-2 rounded-[1.5rem] border border-white/60 dark:border-white/10 backdrop-blur-md shadow-sm w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab("guests")}
                        className={cn("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "guests" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Directory
                    </button>
                    <button
                        onClick={() => setActiveTab("arrival")}
                        className={cn("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "arrival" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Arrivals
                    </button>
                    <button
                        onClick={() => setActiveTab("departure")}
                        className={cn("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300", 
                            activeTab === "departure" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
                        }
                    >
                        Departures
                    </button>
                </div>

                {/* Guest Management */}
                {activeTab === "guests" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row gap-4 justify-between items-stretch sm:items-center">
                            <h2 className="text-lg font-semibold">Guest List</h2>
                            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                                <div className="relative group w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        placeholder="Search by name, email or phone..."
                                        className="pl-11 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 md:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={uploading}
                                        className="h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4 text-blue-500" />}
                                        IMPORT
                                    </Button>

                                    <Button 
                                        onClick={handleDownloadTemplate}
                                        className="h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Download className="w-4 h-4 text-blue-500" />
                                        TEMPLATE
                                    </Button>

                                    {event?.is_whatsapp_enabled && (
                                        <Button 
                                            onClick={handleSendAllInvites}
                                            disabled={sendingAllWhatsApp || guests.filter(g => g.phone).length === 0}
                                            className="col-span-2 h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                                        >
                                            {sendingAllWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                            SEND ALL INVITES
                                        </Button>
                                    )}

                                    <Button 
                                        onClick={() => setShowAddGuestModal(true)}
                                        className="col-span-2 h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/10"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Add Guest
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-sm text-left min-w-[800px] md:min-w-0">
                                <thead className="bg-[#f8f9fa] dark:bg-white/5">
                                    <tr className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-white/5">
                                        <th className="px-6 sm:px-10 py-4 sm:py-6 whitespace-nowrap">Guest Identity</th>
                                        <th className="px-6 py-4 sm:py-6 whitespace-nowrap">Direct Contact</th>
                                        <th className="px-6 py-4 sm:py-6 whitespace-nowrap">RSVP Status</th>
                                        <th className="px-6 py-4 sm:py-6 whitespace-nowrap">Party Size</th>
                                        <th className="px-6 sm:px-10 py-4 sm:py-6 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {flattenedGuests.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-500">No guests found</td></tr>
                                        ) : (
                                            flattenedGuests.map((guest) => (                                                <tr key={guest.uniqueKey || guest.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            {!guest.isPrimary && <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {guest.actualName || guest.name}
                                                                </span>
                                                                {!guest.isPrimary && (
                                                                    <span className="text-[10px] text-zinc-500 italic mt-0.5">
                                                                        (Companion of {guest.displayName})
                                                                    </span>
                                                                )}
                                                                {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                                                            Added by {coordinators[guest.coordinator_id]}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                            {guest.phone || <span className="opacity-30">—</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                            guest.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                            guest.status === "declined" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                        )}>
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", 
                                                                guest.status === "accepted" ? "bg-emerald-500" :
                                                                guest.status === "declined" ? "bg-rose-500" :
                                                                "bg-amber-500"
                                                            )} />
                                                            {guest.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        {guest.isPrimary && (
                                                            <div className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                                                                <Users size={14} className="text-zinc-400" />
                                                                <span className="text-sm font-black">{guest.groupSize}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2 duration-300">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl p-0 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                                                                onClick={() => handleSendIndividualWhatsApp(guest)}
                                                                disabled={sendingWhatsApp[guest.id] || !guest.phone}
                                                                title={guest.phone ? "Send WhatsApp Invite" : "No phone number"}
                                                            >
                                                                {sendingWhatsApp[guest.id] ? (
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                ) : (
                                                                    <MessageSquare size={16} />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl p-0 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => setSelectedGuest(guest)}
                                                            >
                                                                <Eye size={16} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl p-0 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => handleDeleteGuest(guest)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>

                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Arrival Management */}
                {activeTab === "arrival" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <h2 className="text-lg font-semibold">Arrival Details</h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                        placeholder="Search guests..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" onClick={handleExportArrival}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Guest Name</th>
                                        <th className="px-6 py-3 font-medium">Arrival Date</th>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Station/Airport</th>
                                        <th className="px-6 py-3 font-medium">Travel Mode</th>
                                        <th className="px-6 py-3 font-medium">Flight/Train No</th>
                                        <th className="px-6 py-3 font-medium">Ticket</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(() => {
                                        const guestsWithArrival = filteredGuests.filter(g => g.departure_details?.arrival?.date || g.departure_details?.arrival_date);
                                        
                                        if (guestsWithArrival.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                                                        No arrival details found.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return guestsWithArrival.flatMap((guest) => {
                                            const arrivalData = guest.departure_details;
                                            const arrival = arrivalData?.arrival;
                                            const travelers = arrival?.travelers || [];

                                            if (travelers.length === 0) {
                                                return (
                                                    <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                            <div>{guest.name}</div>
                                                            {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                    {coordinators[guest.coordinator_id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">
                                                            {arrivalData?.arrival_date ? format(new Date(arrivalData.arrival_date), "MMM d, yyyy") : "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">{arrivalData?.arrival_time || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{arrivalData?.arrival_location || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{arrivalData?.arrival_mode || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{arrivalData?.transport_number || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-400 italic text-xs">No Ticket</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return travelers.map((traveler: any, idx: number) => (
                                                <tr key={`${guest.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                        <div className="flex flex-col">
                                                            <span>{traveler.name || guest.name}</span>
                                                            {idx > 0 && (
                                                                <span className="text-[10px] text-zinc-500 italic font-normal">
                                                                    (Companion of {guest.name})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                {coordinators[guest.coordinator_id]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") :
                                                            arrivalData?.arrival_date ? format(new Date(arrivalData.arrival_date), "MMM d, yyyy") : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">{arrival?.time || arrivalData?.arrival_time || "-"}</td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {traveler.station_airport || arrivalData?.arrival_location || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${(traveler.mode_of_travel || arrivalData?.arrival_mode) === "By Air" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                            (traveler.mode_of_travel || arrivalData?.arrival_mode) === "Train" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                                            }`}>
                                                            {traveler.mode_of_travel || arrivalData?.arrival_mode || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {traveler.transport_number || arrivalData?.transport_number || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {traveler.ticket_url ? (
                                                            <a href={traveler.ticket_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                                                                View Ticket
                                                            </a>
                                                        ) : (
                                                            <span className="text-zinc-400 text-xs">No ticket</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {idx === 0 && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Departure Details Table */}
                {activeTab === "departure" && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <h2 className="text-lg font-semibold">Departure Details</h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                        placeholder="Search guests..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" onClick={handleExportDeparture}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Guest Name</th>
                                        <th className="px-6 py-3 font-medium">Departure Date</th>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Station/Airport</th>
                                        <th className="px-6 py-3 font-medium">Travel Mode</th>
                                        <th className="px-6 py-3 font-medium">Flight/Train No</th>
                                        <th className="px-6 py-3 font-medium">Ticket</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(() => {
                                        const guestsWithDeparture = filteredGuests.filter(g => g.departure_details && (g.departure_details.applicable === false || g.departure_details.departure?.date || g.departure_details.departure_date));

                                        if (guestsWithDeparture.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                                                        No departure details submitted yet.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return guestsWithDeparture.flatMap((guest: any) => {
                                            const departureData = guest.departure_details;
                                            const departure = departureData?.departure;
                                            const travelers = departure?.travelers || departureData?.travelers || [];

                                            // Check if departure is not applicable
                                            if (departureData?.applicable === false) {
                                                return (
                                                    <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                            <div>{guest.name}</div>
                                                            {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                    {coordinators[guest.coordinator_id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4 text-zinc-500 italic">Not Applicable</td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-zinc-400 text-xs italic">Not Required</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            if (travelers.length === 0) {
                                                return (
                                                    <tr key={guest.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                            <div>{guest.name}</div>
                                                            {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                    {coordinators[guest.coordinator_id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">
                                                            {departure?.date ? format(new Date(departure.date), "MMM d, yyyy") :
                                                                departureData?.departure_date ? format(new Date(departureData.departure_date), "MMM d, yyyy") : "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">
                                                            {departure?.time || departureData?.departure_time || "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500">{departureData?.departure_location || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{departureData?.departure_mode || "-"}</td>
                                                        <td className="px-6 py-4 text-zinc-500">{departureData?.transport_number || "-"}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return travelers.map((traveler: any, idx: number) => (
                                                <tr key={`${guest.id}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                        <div className="flex flex-col">
                                                            <span>{traveler.name || guest.name}</span>
                                                            {idx > 0 && (
                                                                <span className="text-[10px] text-zinc-500 italic font-normal">
                                                                    (Companion of {guest.name})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {guest.coordinator_id && coordinators[guest.coordinator_id] && (
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                                {coordinators[guest.coordinator_id]}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {departure?.date ? format(new Date(departure.date), "MMM d, yyyy") :
                                                            departureData?.departure_date ? format(new Date(departureData.departure_date), "MMM d, yyyy") : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {departure?.time || departureData?.departure_time || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {traveler.station_airport || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${traveler.mode_of_travel === "By Air" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                            traveler.mode_of_travel === "Train" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                                            }`}>
                                                            {traveler.mode_of_travel || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-500">
                                                        {traveler.transport_number || departureData?.transport_number || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {traveler.ticket_url ? (
                                                            <a href={traveler.ticket_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                                                                View Ticket
                                                            </a>
                                                        ) : (
                                                            <span className="text-zinc-400 text-xs">No ticket</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {idx === 0 && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600" onClick={() => setSelectedGuest(guest)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => handleDeleteDepartureDetails(guest.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            
            <GuestDetailsModal
                guest={selectedGuest}
                onClose={() => setSelectedGuest(null)}
                onUpdate={handleGuestUpdate}
                eventName={event?.name}
                eventDate={event?.date}
            />

            {/* Add Guest Modal */}
            {showAddGuestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAddGuestModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Add Guest</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Expand your event directory with a new attendee.</p>
                            </div>
    
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Full Identity</Label>
                                    <Input
                                        placeholder="Enter guest name"
                                        value={newGuestName}
                                        onChange={(e) => setNewGuestName(e.target.value)}
                                        className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Email (Optional)</Label>
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newGuestEmail}
                                            onChange={(e) => setNewGuestEmail(e.target.value)}
                                            className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Phone (Optional)</Label>
                                        <Input
                                            placeholder="+91..."
                                            value={newGuestPhone}
                                            onChange={(e) => setNewGuestPhone(e.target.value)}
                                            className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                        />
                                    </div>
                                </div>
    
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Guardian / Primary Guest</Label>
                                    <select
                                        className="w-full flex h-14 rounded-2xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-6 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                                        value={selectedPrimaryGuestId || ""}
                                        onChange={(e) => setSelectedPrimaryGuestId(e.target.value || null)}
                                    >
                                        <option value="">Independent Guest</option>
                                        {guests
                                            .filter(g => !g.parent_id)
                                            .map((g) => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-1 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleAddGuest} 
                                    disabled={addGuestLoading}
                                >
                                    {addGuestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5 mr-2" />}
                                    Confirm Addition
                                </Button>
                                <Button 
                                    className="h-14 rounded-2xl px-8 font-black bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                    onClick={() => setShowAddGuestModal(false)}
                                >
                                    Discard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDeleteModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
                                    <Trash2 className="text-rose-600 dark:text-rose-400" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Delete Guest?</h3>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        {guestToDelete?.isPrimary ? (
                                            <>This will permanently remove <span className="text-zinc-900 dark:text-zinc-50 font-bold">"{guestToDelete.actualName}"</span> and all associated companions.</>
                                        ) : (
                                            <>Are you sure you want to remove <span className="text-zinc-900 dark:text-zinc-50 font-bold">"{guestToDelete?.actualName}"</span> from the guest list?</>
                                        )}
                                    </p>
                                </div>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Administrative Credential</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter password to confirm"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-rose-500/10 transition-all font-bold"
                                />
                            </div>
    
                            <div className="flex flex-col gap-3">
                                <Button 
                                    variant="destructive" 
                                    className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all shadow-xl shadow-rose-900/20"
                                    onClick={executeDelete} 
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Purge Everything"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl font-black text-zinc-500 dark:text-zinc-400 hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeletePassword("");
                                    }}
                                >
                                    Keep Event
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Guest Delete Confirmation Modal */}
            {showGuestDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowGuestDeleteModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                    <Users size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Remove Guest?</h3>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">This attendee and their companions will be removed from the directory.</p>
                                </div>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Admin Validation</Label>
                                <Input
                                    type="password"
                                    placeholder="Confirm password"
                                    value={guestDeletePassword}
                                    onChange={(e) => setGuestDeletePassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && executeDeleteGuest()}
                                    className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-rose-500/10 transition-all font-bold"
                                    autoFocus
                                    autoComplete="new-password"
                                />
                            </div>
    
                            <div className="flex flex-col gap-2">
                                <Button 
                                    variant="destructive" 
                                    className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all"
                                    onClick={executeDeleteGuest} 
                                    disabled={guestDeleteLoading}
                                >
                                    {guestDeleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete Guest"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl font-black text-zinc-500 dark:text-zinc-400 hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                                    onClick={() => {
                                        setShowGuestDeleteModal(false);
                                        setGuestToDelete(null);
                                        setGuestDeletePassword("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Name Update Confirmation Modal */}
            {showNameUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowNameUpdateModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                    <Pencil size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Update Event Identity?</h3>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                        Changing the name will also regenerate the URL slug. Existing invite links will break.
                                    </p>
                                </div>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Admin Validation</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter password to confirm"
                                    value={nameUpdatePassword}
                                    onChange={(e) => setNameUpdatePassword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && executeUpdateName()}
                                    className="h-14 bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold"
                                    autoFocus
                                    autoComplete="new-password"
                                />
                            </div>
    
                            <div className="flex flex-col gap-2">
                                <Button 
                                    className="h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black transition-all"
                                    onClick={executeUpdateName} 
                                    disabled={nameUpdateLoading}
                                >
                                    {nameUpdateLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Update"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl font-black text-zinc-500 dark:text-zinc-400 hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                                    onClick={() => {
                                        setShowNameUpdateModal(false);
                                        setNameUpdatePassword("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDropLocationsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDropLocationsModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Drop Locations</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Define destinations for guest transportation.</p>
                            </div>
    
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Locations Registry (Comma separated)</Label>
                                <Textarea
                                    placeholder="Grand Hyatt Goa, Taj Exotica, The Leela..."
                                    value={dropLocationsText}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDropLocationsText(e.target.value)}
                                    rows={5}
                                    className="bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/10 rounded-2xl px-6 py-4 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all font-bold resize-none"
                                />
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-1 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleUpdateDropLocations} 
                                    disabled={dropLocationsLoading}
                                >
                                    {dropLocationsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Assignments"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl px-8 font-black text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                    onClick={() => setShowDropLocationsModal(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showHotelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowHotelModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in slide-in-from-bottom-8 duration-300 border border-zinc-100 dark:border-white/10">
                        <div className="p-8 md:p-10 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Hotel Access</h3>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Collaborate with your hospitality partners.</p>
                            </div>
    
                            <div className="grid gap-6">
                                <div className="space-y-2 relative">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Select Hospitality Partner</Label>
                                    
                                    {/* Custom Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsHotelDropdownOpen(!isHotelDropdownOpen)}
                                            className="w-full flex items-center justify-between h-14 rounded-2xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer group"
                                        >
                                            <span className={cn(
                                                "truncate",
                                                !hotelName ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-50"
                                            )}>
                                                {hotelName ? `${hotelName} (${hotelEmail})` : "Choose a hospitality partner..."}
                                            </span>
                                            <ChevronDown className={cn(
                                                "w-4 h-4 text-zinc-400 transition-transform duration-300",
                                                isHotelDropdownOpen ? "rotate-180" : ""
                                            )} />
                                        </button>

                                        <AnimatePresence>
                                            {isHotelDropdownOpen && (
                                                <>
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setIsHotelDropdownOpen(false)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                                        className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-[1.5rem] shadow-2xl shadow-zinc-900/10 dark:shadow-none overflow-hidden"
                                                    >
                                                        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                                            {allHotels.length === 0 ? (
                                                                <div className="p-4 text-center text-zinc-500 text-xs font-medium">
                                                                    No hotels found. Register hotels in the Hotels section.
                                                                </div>
                                                            ) : (
                                                                allHotels.map((h) => (
                                                                    <button
                                                                        key={h.email}
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-bold transition-all group",
                                                                            hotelEmail === h.email 
                                                                                ? "bg-blue-500/10 text-blue-600 dark:bg-white/10 dark:text-white" 
                                                                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-50"
                                                                        )}
                                                                        onClick={() => {
                                                                            setHotelName(h.name);
                                                                            setHotelEmail(h.email);
                                                                            setIsHotelDropdownOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="truncate">{h.name}</span>
                                                                            <span className="text-[10px] opacity-60 font-medium truncate">{h.email}</span>
                                                                        </div>
                                                                        {hotelEmail === h.email && (
                                                                            <Check className="w-4 h-4 shrink-0" />
                                                                        )}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    
                                    {event?.assigned_hotel_email && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mt-2">
                                            <Hotel size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                Currently Assigned: {event.assigned_hotel_name || event.assigned_hotel_email}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
    
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button 
                                    className="flex-3 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-black hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-none"
                                    onClick={handleAssignHotel} 
                                    disabled={assignLoading}
                                >
                                    {assignLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Partner"}
                                </Button>
                                {event?.assigned_hotel_email && (
                                    <Button 
                                        variant="ghost"
                                        className="h-14 rounded-2xl px-6 font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                        onClick={async () => {
                                            const confirmed = await toast.confirm("Revoke Access", "Are you sure you want to revoke hospitality partner access?");
                                            if (!confirmed) return;
                                            setAssignLoading(true);
                                            try {
                                                const { error } = await supabase.from("events").update({ assigned_hotel_email: null, assigned_hotel_name: null }).eq("id", eventId);
                                                if (error) throw error;
                                                setEvent(prev => prev ? ({ ...prev, assigned_hotel_email: undefined, assigned_hotel_name: undefined }) : null);
                                                setHotelEmail("");
                                                setHotelName("");
                                                setShowHotelModal(false);
                                                toast.success("Access revoked successfully.");
                                            } catch (e: any) {
                                                toast.error(e.message);
                                            } finally {
                                                setAssignLoading(false);
                                            }
                                        }}
                                        disabled={assignLoading}
                                    >
                                        Revoke
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="h-14 rounded-2xl px-6 font-black text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    onClick={() => setShowHotelModal(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default withAuth(EventDetails);
