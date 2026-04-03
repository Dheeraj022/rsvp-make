"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Search,
    LogOut,
    CheckCircle2,
    XCircle,
    Loader2,
    User,
    Users,
    Calendar,
    Bus,
    RefreshCw,
    Menu,
    X,
    Phone,
    FileSpreadsheet,
    MapPin,
    Train,
    Clock,
    Navigation,
    FileText,
    UserPlus,
    Plane,
    PlaneLanding,
    Mail,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/useToast";
import withAuth from "@/components/auth/withAuth";

// Types
type Guest = {
    id: string;
    name: string;
    phone?: string | null;
    parent_id?: string | null;
    arrival_date?: string | null;
    arrival_time?: string | null;
    check_in_status: string;
    departure_status?: string;
    seat_number?: string;
    assignment_label?: string;
    event_id: string;
    attending_count: number;
    attendees_data?: any[];
    departure_details?: any;
    notes?: string;
    events?: {
        name: string;
        date: string;
    };
};

function CoordinatorDashboard() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Driver Modal State
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [selectedGuestForDriver, setSelectedGuestForDriver] = useState<any>(null);
    const [driverName, setDriverName] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [driverVehicle, setDriverVehicle] = useState("");
    const [driverType, setDriverType] = useState<'arrival' | 'departure'>('arrival');
    const [isUpdatingDriver, setIsUpdatingDriver] = useState(false);
    const [coordinator, setCoordinator] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"arrived" | "departure">("arrived");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Note Modal State
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedGuestForNote, setSelectedGuestForNote] = useState<any | null>(null);
    const [noteContent, setNoteContent] = useState("");
    const [noteType, setNoteType] = useState<'arrival' | 'departure'>('arrival');
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);

    // Add Guest Modal State
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [newGuestName, setNewGuestName] = useState("");
    const [newGuestPhone, setNewGuestPhone] = useState("");
    const [newGuestEmail, setNewGuestEmail] = useState("");

    // Transport for new guest
    const [arrDate, setArrDate] = useState("");
    const [arrTime, setArrTime] = useState("");
    const [arrMode, setArrMode] = useState("Flight");
    const [arrTransportNo, setArrTransportNo] = useState("");
    const [arrStation, setArrStation] = useState("");

    const [depDate, setDepDate] = useState("");
    const [depTime, setDepTime] = useState("");
    const [depMode, setDepMode] = useState("Flight");
    const [depTransportNo, setDepTransportNo] = useState("");
    const [depStation, setDepStation] = useState("");

    // Primary Guest Linking
    const [selectedPrimaryGuestId, setSelectedPrimaryGuestId] = useState<string | null>(null);

    // Accordion Sections for Add Guest Modal
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    // New State for Individual Companion Drivers
    const [assignSameDriver, setAssignSameDriver] = useState(true);
    const [companionDrivers, setCompanionDrivers] = useState<Record<number, { name: string; phone: string; vehicle_number?: string }>>({});

    const router = useRouter();

    // Toast Hook
    const toast = useToast();

    useEffect(() => {
        fetchCoordinatorAndGuests();
    }, []);

    // Flattened and Filtered Guests
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
            // Skip linked companions in the main loop (they will be added under their parent)
            if (guest.parent_id) return;

            // 1. Prepare Primary Guest Entry
            const primaryEntry = {
                ...guest,
                isPrimary: true,
                displayName: guest.name,
                actualName: guest.name,
                arrival_notes: guest.departure_details?.arrival?.notes || "",
                departure_notes: guest.departure_details?.departure?.notes || "",
                uniqueKey: `primary-${guest.id}`
            };

            // 2. Prepare Companion Entries (both attendees_data AND linked separately)

            // 2a. Internal attendees_data companions
            const attendeeCompanions = (guest.attendees_data || []).map((m: any, i) => {
                if (m.name === guest.name) return null;
                const companionDetails = { ...(guest.departure_details || {}) };
                if (m.arrival_driver) {
                    companionDetails.arrival = { ...(companionDetails.arrival || {}), driver: m.arrival_driver };
                }
                if (m.departure_driver) {
                    companionDetails.departure = { ...(companionDetails.departure || {}), driver: m.departure_driver };
                }
                return {
                    ...guest,
                    ...m,
                    departure_details: companionDetails,
                    isPrimary: false,
                    companionIndex: i,
                    displayName: guest.name,
                    actualName: m.name,
                    arrival_notes: m.arrival_notes || "",
                    departure_notes: m.departure_notes || "",
                    uniqueKey: `companion-${guest.id}-${i}`,
                    isLinkedGuest: false
                };
            }).filter(Boolean);

            // 2b. Linked companions (separate rows in DB)
            const linkedCompanions = (linkedCompanionsMap[guest.id] || []).map((lg, i) => {
                return {
                    ...lg,
                    isPrimary: false,
                    displayName: guest.name,
                    actualName: lg.name,
                    arrival_notes: lg.departure_details?.arrival?.notes || "",
                    departure_notes: lg.departure_details?.departure?.notes || "",
                    uniqueKey: `linked-${lg.id}`,
                    isLinkedGuest: true
                };
            });

            const allCompanionEntries = [...attendeeCompanions, ...linkedCompanions];

            // 3. Filter based on query
            const matchesPrimary =
                primaryEntry.name.toLowerCase().includes(query) ||
                primaryEntry.phone?.toLowerCase().includes(query) ||
                primaryEntry.seat_number?.toLowerCase().includes(query);

            const matchingCompanions = allCompanionEntries.filter(c =>
                c.actualName.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            );

            // If query matches primary, show primary AND all their companions (group context)
            // If query matches ONLY a companion, show that companion specifically.
            // If query is empty, show everything.
            if (!query) {
                result.push(primaryEntry);
                result.push(...allCompanionEntries);
            } else if (matchesPrimary) {
                result.push(primaryEntry);
                // Also show companions if the primary name matches
                result.push(...allCompanionEntries);
            } else if (matchingCompanions.length > 0) {
                // Show ONLY matching companions if primary didn't match
                result.push(...matchingCompanions);
            }
        });

        return result;
    }, [searchQuery, guests]);

    // Unique drivers for the dropdown selection
    const availableDrivers = useMemo(() => {
        const driversMap = new Map<string, { name: string; phone: string }>();
        guests.forEach(g => {
            const arrDriver = g.departure_details?.arrival?.driver;
            const depDriver = g.departure_details?.departure?.driver;

            if (arrDriver?.name) {
                driversMap.set(`${arrDriver.name}-${arrDriver.phone}`, { name: arrDriver.name, phone: arrDriver.phone });
            }
            if (depDriver?.name) {
                driversMap.set(`${depDriver.name}-${depDriver.phone}`, { name: depDriver.name, phone: depDriver.phone });
            }

            // Also check companions for saved drivers
            (g.attendees_data || []).forEach((companion: any) => {
                const companionArrDriver = companion.arrival_driver;
                const companionDepDriver = companion.departure_driver;
                if (companionArrDriver?.name) {
                    driversMap.set(`${companionArrDriver.name}-${companionArrDriver.phone}`, { name: companionArrDriver.name, phone: companionArrDriver.phone });
                }
                if (companionDepDriver?.name) {
                    driversMap.set(`${companionDepDriver.name}-${companionDepDriver.phone}`, { name: companionDepDriver.name, phone: companionDepDriver.phone });
                }
            });
        });
        return Array.from(driversMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [guests]);

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Guest Report");

        // Define Columns (Removed Seat)
        worksheet.columns = [
            { header: "Type", key: "type", width: 12 },
            { header: "Name", key: "name", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "Event", key: "event", width: 20 },
            { header: "Date", key: "date", width: 12 },
            { header: "Arrived", key: "arrived", width: 10 },
            { header: "Departed", key: "departed", width: 10 },
            { header: "Arrival Date", key: "arrivalDate", width: 15 },
            { header: "Arrival Time", key: "arrivalTime", width: 12 },
            { header: "Arrival Transport", key: "arrivalTransport", width: 15 },
            { header: "Drop Location", key: "dropLocation", width: 20 },
            { header: "Departure Date", key: "depDate", width: 15 },
            { header: "Departure Time", key: "depTime", width: 12 },
            { header: "Departure Mode", key: "depMode", width: 12 },
            { header: "Departure Ref.", key: "depTransport", width: 15 },
            { header: "Arrival Driver Name", key: "arrDriverName", width: 20 },
            { header: "Arrival Driver Phone", key: "arrDriverPhone", width: 15 },
            { header: "Departure Driver Name", key: "depDriverName", width: 20 },
            { header: "Departure Driver Phone", key: "depDriverPhone", width: 15 }
        ];

        // Format Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Data
        guests.forEach(guest => {
            const arrival = guest.departure_details?.arrival;
            const arrTraveler = arrival?.travelers?.[0];
            const departure = guest.departure_details?.departure;
            const depTraveler = departure?.travelers?.[0];

            // Main Guest
            const mainRow = worksheet.addRow({
                type: "Primary",
                name: guest.name,
                phone: guest.phone || "-",
                event: guest.events?.name || "-",
                date: guest.events?.date ? format(new Date(guest.events.date), "MMM d") : "-",
                arrived: guest.check_in_status === "arrived" ? "Yes" : "No",
                departed: guest.departure_status === "departed" ? "Yes" : "No",
                arrivalDate: arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") : "-",
                arrivalTime: arrival?.time || "-",
                arrivalTransport: arrTraveler ? `${arrTraveler.mode_of_travel || ""}${arrTraveler.transport_number ? ` (${arrTraveler.transport_number})` : ""}` : "-",
                depDate: departure?.date ? format(new Date(departure.date), "MMM d, yyyy") : "-",
                depTime: departure?.time || "-",
                depMode: depTraveler?.mode_of_travel || "-",
                depTransport: depTraveler?.transport_number || "-",
                arrDriverName: arrival?.driver?.name || "-",
                arrDriverPhone: arrival?.driver?.phone || "-",
                depDriverName: departure?.driver?.name || "-",
                depDriverPhone: departure?.driver?.phone || "-"
            });

            // Add Companions
            if (guest.attendees_data && guest.attendees_data.length > 0) {
                guest.attendees_data.forEach((member: any) => {
                    const cArrDriver = member.arrival_driver || arrival?.driver;
                    const cDepDriver = member.departure_driver || departure?.driver;

                    worksheet.addRow({
                        type: "Companion",
                        name: member.name,
                        phone: member.phone || "-",
                        event: guest.events?.name || "-",
                        date: guest.events?.date ? format(new Date(guest.events.date), "MMM d") : "-",
                        arrived: member.checked_in ? "Yes" : "No",
                        departed: member.departed ? "Yes" : "No",
                        arrivalDate: arrival?.date ? format(new Date(arrival.date), "MMM d, yyyy") : "-",
                        arrivalTime: arrival?.time || "-",
                        arrivalTransport: arrTraveler ? `${arrTraveler.mode_of_travel || ""}${arrTraveler.transport_number ? ` (${arrTraveler.transport_number})` : ""}` : "-",
                        depDate: departure?.date ? format(new Date(departure.date), "MMM d, yyyy") : "-",
                        depTime: departure?.time || "-",
                        depMode: depTraveler?.mode_of_travel || "-",
                        depTransport: depTraveler?.transport_number || "-",
                        arrDriverName: cArrDriver?.name || "-",
                        arrDriverPhone: cArrDriver?.phone || "-",
                        depDriverName: cDepDriver?.name || "-",
                        depDriverPhone: cDepDriver?.phone || "-"
                    });
                });
            }
        });

        // Apply Conditional Formatting (Yes = Green, No = Red)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            row.eachCell((cell) => {
                if (cell.value === "Yes") {
                    cell.font = { color: { argb: 'FF10B981' }, bold: true }; // Green
                } else if (cell.value === "No") {
                    cell.font = { color: { argb: 'FFEF4444' }, bold: true }; // Red
                }
            });
        });

        // Generate and Save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, `Guest_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const fetchCoordinatorAndGuests = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // Fetch coordinator metadata
            const { data: coordData, error: coordError } = await supabase
                .from("coordinators")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (coordError) {
                console.error("Auth error or coordinator not found:", coordError);
                if (coordError.code === "PGRST116" || coordError.message?.includes("Refresh Token")) {
                    router.push("/coordinator/login");
                    return;
                }
                throw coordError;
            }
            if (!coordData) throw new Error("Coordinator not found");
            setCoordinator(coordData);

            // Fetch guests assigned to this coordinator or their assigned event
            let guestsQuery = supabase
                .from("guests")
                .select(`
                    id, name, phone, check_in_status, seat_number, assignment_label, event_id, attending_count, attendees_data, departure_details, parent_id, coordinator_id,
                    events ( name, date )
                `);

            if (coordData.event_id) {
                // If the coordinator is assigned to an event, show all guests for that event
                guestsQuery = guestsQuery.eq("event_id", coordData.event_id);
            } else {
                // Otherwise only guests directly assigned to the coordinator
                guestsQuery = guestsQuery.eq("coordinator_id", coordData.id);
            }

            const { data: guestsData, error: guestsError } = await guestsQuery.order("name", { ascending: true });

            if (guestsError) throw guestsError;

            const formattedGuests = (guestsData || []).map((guest: any) => ({
                ...guest,
                events: Array.isArray(guest.events) ? guest.events[0] : guest.events
            }));

            setGuests(formattedGuests);
        } catch (error: any) {
            console.error("Error fetching data:", error.message);
            if (error.message?.includes("Refresh Token") || error.status === 401 || error.code === "401") {
                router.push("/coordinator/login");
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleUpdateDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuestForDriver) return;

        setIsUpdatingDriver(true);
        try {
            const currentDetails = selectedGuestForDriver.departure_details || {};
            const updatedDetails = { ...currentDetails };
            const updatedAttendees = [...(selectedGuestForDriver.attendees_data || [])];

            if (driverType === 'arrival') {
                updatedDetails.arrival = {
                    ...(updatedDetails.arrival || {}),
                    driver: { name: driverName, phone: driverPhone, vehicle_number: driverVehicle }
                };
            } else {
                updatedDetails.departure = {
                    ...(updatedDetails.departure || {}),
                    driver: { name: driverName, phone: driverPhone, vehicle_number: driverVehicle }
                };
            }

            // Handle individual companion drivers
            if (!assignSameDriver) {
                updatedAttendees.forEach((m, idx) => {
                    if (companionDrivers[idx]) {
                        if (driverType === 'arrival') {
                            m.arrival_driver = companionDrivers[idx];
                        } else {
                            m.departure_driver = companionDrivers[idx];
                        }
                    }
                });
            } else {
                // If "Assign same" is selected, clear individual driver overrides for this type
                updatedAttendees.forEach(m => {
                    if (driverType === 'arrival') {
                        delete m.arrival_driver;
                    } else {
                        delete m.departure_driver;
                    }
                });
            }

            console.log(`Updating ${driverType} driver details with:`, updatedDetails);

            const { error } = await supabase
                .from("guests")
                .update({
                    departure_details: updatedDetails,
                    attendees_data: updatedAttendees
                })
                .eq("id", selectedGuestForDriver.id);

            if (error) throw error;

            toast.success("Driver assigned successfully");
            setIsDriverModalOpen(false);
            fetchCoordinatorAndGuests(); // Refresh data
        } catch (error: any) {
            console.error("Detailed error updating driver:", error);
            toast.error(`Failed to assign driver: ${error.message || "Unknown error"}`);
        } finally {
            setIsUpdatingDriver(false);
        }
    };

    const handleSendDriverNotification = async (guest: any, driverType: 'arrival' | 'departure') => {
        const confirmed = await toast.confirm(
            "Send Notification",
            "Are you sure you want to send driver details to the guest?"
        );
        if (!confirmed) return;

        try {
            const driver = driverType === 'arrival'
                ? guest.departure_details?.arrival?.driver
                : guest.departure_details?.departure?.driver;

            if (!guest.phone) {
                toast.error("Guest does not have a phone number.");
                return;
            }

            const payload = {
                guest: { id: guest.id, name: guest.actualName || guest.name, phone: guest.phone },
                driver: { name: driver.name, phone: driver.phone },
                eventId: guest.event_id || coordinator?.event_id,
                eventName: guest.events?.name
            };

            const response = await fetch("/api/whatsapp/send-driver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(`Notification sent to ${guest.actualName || guest.name}`);
            } else {
                if (result.duplicate) {
                    toast.error("Notification already sent to this guest.");
                } else {
                    toast.error(`Failed: ${result.error}`);
                }
            }
        } catch (error: any) {
            toast.error("Failed to send driver notification");
        }
    };

    const openNoteModal = (person: any, type: 'arrival' | 'departure') => {
        setSelectedGuestForNote(person);
        setNoteType(type);
        setNoteContent(type === 'arrival' ? person.arrival_notes || "" : person.departure_notes || "");
        setIsNoteModalOpen(true);
    };

    const handleUpdateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuestForNote) return;

        setIsUpdatingNote(true);
        try {
            const guestId = selectedGuestForNote.id;
            const isPrimary = selectedGuestForNote.isPrimary;

            // Fetch current guest data to ensure we have latest attendees_data/departure_details
            const { data: currentGuest, error: fetchError } = await supabase
                .from("guests")
                .select("*")
                .eq("id", guestId)
                .single();

            if (fetchError) throw fetchError;

            let updatePayload: any = {};

            if (isPrimary) {
                const updatedDetails = { ...(currentGuest.departure_details || {}) };
                if (!updatedDetails[noteType]) {
                    updatedDetails[noteType] = {};
                }
                updatedDetails[noteType].notes = noteContent;
                updatePayload = { departure_details: updatedDetails };
            } else {
                const updatedAttendees = [...(currentGuest.attendees_data || [])];
                const index = selectedGuestForNote.companionIndex;
                if (updatedAttendees[index]) {
                    if (noteType === 'arrival') {
                        updatedAttendees[index].arrival_notes = noteContent;
                    } else {
                        updatedAttendees[index].departure_notes = noteContent;
                    }
                }
                updatePayload = { attendees_data: updatedAttendees };
            }

            const { error } = await supabase
                .from("guests")
                .update(updatePayload)
                .eq("id", guestId);

            if (error) throw error;

            toast.success("Note saved successfully");
            setIsNoteModalOpen(false);
            fetchCoordinatorAndGuests();
        } catch (error: any) {
            console.error("Error saving note:", error);
            toast.error("Failed to save note");
        } finally {
            setIsUpdatingNote(false);
        }
    };

    const handleRemoveNote = async () => {
        if (!selectedGuestForNote) return;

        // Ask for confirmation
        const confirmed = await toast.confirm("Remove Note", "Are you sure you want to remove this note?");
        if (!confirmed) return;

        setIsUpdatingNote(true);
        try {
            const guestId = selectedGuestForNote.id;
            const isPrimary = selectedGuestForNote.isPrimary;

            const { data: currentGuest, error: fetchError } = await supabase
                .from("guests")
                .select("*")
                .eq("id", guestId)
                .single();

            if (fetchError) throw fetchError;

            let updatePayload: any = {};

            if (isPrimary) {
                const updatedDetails = { ...(currentGuest.departure_details || {}) };
                if (updatedDetails[noteType]) {
                    delete updatedDetails[noteType].notes;
                }
                updatePayload = { departure_details: updatedDetails };
            } else {
                const updatedAttendees = [...(currentGuest.attendees_data || [])];
                const index = selectedGuestForNote.companionIndex;
                if (updatedAttendees[index]) {
                    if (noteType === 'arrival') {
                        delete updatedAttendees[index].arrival_notes;
                    } else {
                        delete updatedAttendees[index].departure_notes;
                    }
                }
                updatePayload = { attendees_data: updatedAttendees };
            }

            const { error } = await supabase
                .from("guests")
                .update(updatePayload)
                .eq("id", guestId);

            if (error) throw error;

            toast.success("Note removed successfully");
            setIsNoteModalOpen(false);
            fetchCoordinatorAndGuests();
        } catch (error: any) {
            console.error("Error removing note:", error);
            toast.error("Failed to remove note");
        } finally {
            setIsUpdatingNote(false);
        }
    };

    const openDriverModal = (guest: Guest, type: 'arrival' | 'departure') => {
        setSelectedGuestForDriver(guest);
        setDriverType(type);

        const driver = type === 'arrival'
            ? guest.departure_details?.arrival?.driver
            : guest.departure_details?.departure?.driver;

        setDriverName(driver?.name || "");
        setDriverPhone(driver?.phone || "");
        setDriverVehicle(driver?.vehicle_number || "");

        // Determine if same driver is assigned (default to true)
        let sameDriver = true;
        const companions = guest.attendees_data || [];
        const companionDriversMap: Record<number, { name: string; phone: string; vehicle_number?: string }> = {};

        companions.forEach((m, idx) => {
            const cDriver = type === 'arrival' ? m.arrival_driver : m.departure_driver;
            if (cDriver) {
                sameDriver = false;
                companionDriversMap[idx] = { name: cDriver.name, phone: cDriver.phone, vehicle_number: cDriver.vehicle_number || "" };
            } else {
                // If not assigned, initialize with main driver info (shadowed)
                companionDriversMap[idx] = { name: driver?.name || "", phone: driver?.phone || "", vehicle_number: driver?.vehicle_number || "" };
            }
        });

        setAssignSameDriver(sameDriver);
        setCompanionDrivers(companionDriversMap);
        setIsDriverModalOpen(true);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchCoordinatorAndGuests();
    };

    const handleCheckIn = async (guestId: string, currentStatus: string) => {
        const newStatus = currentStatus === "arrived" ? "pending" : "arrived";
        try {
            const { error } = await supabase
                .from("guests")
                .update({ check_in_status: newStatus })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev =>
                prev.map(g => g.id === guestId ? { ...g, check_in_status: newStatus } : g)
            );
        } catch (error: any) {
            console.error("Error updating check-in status:", error);
            toast.error(`Failed to update status: ${error.message || "Please try again."}`);
        }
    };

    const handleDepartureCheckIn = async (guestId: string, currentStatus: string | undefined) => {
        const newStatus = currentStatus === "departed" ? "pending" : "departed";
        try {
            const { error } = await supabase
                .from("guests")
                .update({ departure_status: newStatus })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev =>
                prev.map(g => g.id === guestId ? { ...g, departure_status: newStatus } : g)
            );
        } catch (error: any) {
            console.error("Error updating departure status:", error);
            toast.error(`Failed to update status: ${error.message || "Please try again."}`);
        }
    };

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGuestName.trim()) {
            toast.error("Please enter a guest name.");
            return;
        }

        setIsAddingGuest(true);
        try {
            let finalEventId = coordinator?.event_id;

            // If coordinator has no explicit event_id, try to pull from existing guests
            if (!finalEventId && guests.length > 0) {
                finalEventId = guests[0].event_id;
            }

            if (!finalEventId) {
                throw new Error("No event ID found to associate with guest. Please contact support.");
            }

            const coordinator_id = coordinator?.id || null;

            const departure_details = {
                applicable: true,
                arrival: {
                    date: arrDate || null,
                    time: arrTime || null,
                    travelers: [{
                        name: newGuestName,
                        mode_of_travel: arrMode,
                        transport_number: arrTransportNo || "",
                        station_airport: arrStation || ""
                    }]
                },
                departure: {
                    date: depDate || null,
                    time: depTime || null,
                    travelers: [{
                        name: newGuestName,
                        mode_of_travel: depMode,
                        transport_number: depTransportNo || "",
                        station_airport: depStation || ""
                    }]
                }
            };

            const payload = {
                name: newGuestName,
                phone: newGuestPhone || null,
                email: newGuestEmail || null,
                event_id: finalEventId,
                coordinator_id: coordinator_id,
                parent_id: selectedPrimaryGuestId,
                status: 'accepted',
                check_in_status: 'pending',
                allowed_guests: 1,
                attending_count: 1,
                attendees_data: [],
                departure_details: departure_details
            };

            const response = await fetch("/api/coordinator/add-guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to add guest through server-side handler.");
            }

            toast.success("Guest added successfully!");
            setIsAddGuestModalOpen(false);

            // Reset state
            setNewGuestName("");
            setNewGuestPhone("");
            setNewGuestEmail("");
            setArrDate("");
            setArrTime("");
            setArrTransportNo("");
            setArrStation("");
            setDepDate("");
            setDepTime("");
            setDepTransportNo("");
            setDepStation("");
            setSelectedPrimaryGuestId(null);
            setExpandedSections([]);

            fetchCoordinatorAndGuests();
        } catch (error: any) {
            console.error("Error adding guest:", error);
            toast.error(`Failed to add guest: ${error.message}`);
        } finally {
            setIsAddingGuest(false);
        }
    };

    const handleSubMemberCheckIn = async (guestId: string, subMemberIndex: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const guest = guests.find(g => g.id === guestId);
            if (!guest || !guest.attendees_data) return;

            const updatedAttendees = [...guest.attendees_data];
            updatedAttendees[subMemberIndex] = {
                ...updatedAttendees[subMemberIndex],
                checked_in: newStatus
            };

            const { error } = await supabase
                .from("guests")
                .update({ attendees_data: updatedAttendees })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev => prev.map(g =>
                g.id === guestId ? { ...g, attendees_data: updatedAttendees } : g
            ));
        } catch (error: any) {
            console.error("Error updating sub-member check-in:", error.message);
            toast.error(`Failed to update companion: ${error.message || "Please try again."}`);
        }
    };

    const handleSubMemberDeparture = async (guestId: string, subMemberIndex: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const guest = guests.find(g => g.id === guestId);
            if (!guest || !guest.attendees_data) return;

            const updatedAttendees = [...guest.attendees_data];
            updatedAttendees[subMemberIndex] = {
                ...updatedAttendees[subMemberIndex],
                departed: newStatus
            };

            const { error } = await supabase
                .from("guests")
                .update({ attendees_data: updatedAttendees })
                .eq("id", guestId);

            if (error) throw error;

            setGuests(prev => prev.map(g =>
                g.id === guestId ? { ...g, attendees_data: updatedAttendees } : g
            ));
        } catch (error: any) {
            console.error("Error updating sub-member departure:", error.message);
            toast.error(`Failed to update companion: ${error.message || "Please try again."}`);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/coordinator/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black gap-4">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-zinc-500 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f5f9] dark:bg-black font-sans flex">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex-col sticky top-0 h-screen">
                <div className="p-8 border-b border-zinc-50 dark:border-zinc-800">
                    <h2 className="text-xl font-black text-blue-600 dark:text-blue-500 tracking-tighter uppercase">Coordinator</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Management Portal</p>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    <button
                        onClick={() => setActiveTab("arrived")}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                            activeTab === "arrived"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <CheckCircle2 size={20} />
                        <span>Arrived Guests</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("departure")}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm",
                            activeTab === "departure"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <PlaneLanding size={20} />
                        <span>Departure List</span>
                    </button>
                </nav>

                <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <User size={20} />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{coordinator?.name}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Coordinator</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="w-full rounded-2xl border-zinc-200 text-zinc-600 font-bold hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/20 transition-all gap-2 h-11 group"
                    >
                        <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in">
                    <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-zinc-900 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
                            <h2 className="font-black text-blue-600 tracking-tighter uppercase">Menu</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full">
                                <X size={20} />
                            </Button>
                        </div>
                        <nav className="p-6 space-y-2 flex-1">
                            <button
                                onClick={() => { setActiveTab("arrived"); setIsSidebarOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm",
                                    activeTab === "arrived" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 bg-zinc-50/50"
                                )}
                            >
                                <CheckCircle2 size={20} />
                                <span>Arrived Guests</span>
                            </button>
                            <button
                                onClick={() => { setActiveTab("departure"); setIsSidebarOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm",
                                    activeTab === "departure" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 bg-zinc-50/50"
                                )}
                            >
                                <PlaneLanding size={20} />
                                <span>Departure List</span>
                            </button>
                        </nav>
                        <div className="p-6 border-t bg-zinc-50/50 dark:bg-zinc-800/20">
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full rounded-2xl font-bold gap-3 h-14 border-zinc-200 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/20 transition-all"
                            >
                                <LogOut size={18} />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Areas */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Modern Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-zinc-900 border-b p-4 flex items-center justify-between sticky top-0 z-40 gap-2">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-xl bg-zinc-50 shadow-sm">
                            <Menu size={20} />
                        </Button>
                        <h2 className="font-black text-lg tracking-tighter uppercase text-zinc-900 dark:text-zinc-50">
                            {activeTab === "arrived" ? "Arrived" : "Departure"}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsAddGuestModalOpen(true)}
                            className="rounded-xl shadow-sm h-10 w-10 bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                        >
                            <UserPlus size={18} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleExportExcel}
                            className="rounded-xl shadow-sm h-10 w-10 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-emerald-600 transition-all"
                        >
                            <FileSpreadsheet size={18} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="rounded-xl shadow-sm h-10 w-10 border-zinc-200 text-zinc-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                            <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 space-y-8">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Content Header (Desktop) */}
                        <div className="hidden lg:flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                                    {activeTab === "arrived" ? "Arrived Dashboard" : "Departure Dashboard"}
                                </h1>
                                <p className="text-zinc-500 font-medium mt-1">Manage guest schedules and status effectively.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => setIsAddGuestModalOpen(true)}
                                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-6 gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                >
                                    <UserPlus size={18} />
                                    <span>Add Guest</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleExportExcel}
                                    className="rounded-2xl border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all h-12 px-6 gap-2"
                                >
                                    <FileSpreadsheet size={18} />
                                    Export Excel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="rounded-2xl border-zinc-200 text-zinc-600 font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all h-12 w-12 p-0 flex items-center justify-center"
                                >
                                    <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {/* Layout Content */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden min-h-[600px] flex flex-col">

                            {/* Stats Ribbon */}
                            <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                                {activeTab === "arrived" ? (
                                    <>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Expecting</span>
                                            <span className="text-4xl font-black text-blue-600">
                                                {guests.reduce((acc, g) => acc + 1 + (g.attendees_data || []).filter((a: any) => a.name !== g.name).length, 0)}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Arrived Now</span>
                                            <span className="text-4xl font-black text-emerald-500">
                                                {guests.reduce((acc, g) => {
                                                    const mainArrived = g.check_in_status === "arrived" ? 1 : 0;
                                                    const subArrived = (g.attendees_data || []).filter((a: any) => a.checked_in && a.name !== g.name).length;
                                                    return acc + mainArrived + subArrived;
                                                }, 0)}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">To Depart</span>
                                            <span className="text-4xl font-black text-blue-600">
                                                {guests.reduce((acc, g) => acc + 1 + (g.attendees_data || []).filter((a: any) => a.name !== g.name).length, 0)}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-10 flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Already Departed</span>
                                            <span className="text-4xl font-black text-indigo-500">
                                                {guests.reduce((acc, g) => {
                                                    const mainDeparted = g.departure_status === "departed" ? 1 : 0;
                                                    const subDeparted = (g.attendees_data || []).filter((a: any) => a.departed && a.name !== g.name).length;
                                                    return acc + mainDeparted + subDeparted;
                                                }, 0)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Event Information Section */}
                            <div className="px-8 py-6 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1.5">Scheduled Event</span>
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                                        {guests[0]?.events?.name || "No Event Assigned"}
                                    </h2>
                                </div>
                                {guests[0]?.events?.date && (
                                    <div className="flex items-center gap-4 bg-blue-50/50 dark:bg-blue-900/10 px-5 py-3 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <Calendar size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Event Date</span>
                                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                {format(new Date(guests[0].events.date), "MMMM d, yyyy")}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dashboard Search */}
                            <div className="p-6 sm:p-8 bg-zinc-50/50 dark:bg-black/10 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="relative group max-w-2xl">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <Input
                                        placeholder={activeTab === "arrived" ? "Search for check-in..." : "Search for departure..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-14 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 h-16 rounded-[1.25rem] shadow-sm focus-visible:ring-blue-500/20 text-lg font-medium"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Content View */}
                            <div className="flex-1 overflow-x-hidden">
                                {activeTab === "arrived" ? (
                                    /* ARRIVED LIST */
                                    <div className="w-full overflow-hidden">
                                        <div className="hidden lg:block">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-[10px] font-black uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                                                        <th className="px-10 py-5">Guest & Companions</th>
                                                        <th className="px-6 py-5 text-center">Arrival Details</th>
                                                        <th className="px-6 py-5 text-center">Status</th>
                                                        <th className="px-10 py-5 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                    {flattenedGuests.length === 0 ? (
                                                        <tr><td colSpan={4} className="p-32 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">No guests found</td></tr>
                                                    ) : (
                                                        flattenedGuests.map((person: any) => (
                                                            <tr key={person.uniqueKey} className="group hover:bg-blue-50/30 transition-colors align-top">
                                                                <td className="px-10 py-8">
                                                                    <div className="flex flex-col gap-1">
                                                                        <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                                                            {person.isPrimary ? person.displayName : person.actualName}
                                                                        </h4>
                                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                            {person.isPrimary ? (
                                                                                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded">PRIMARY</span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                                                                    Primary: {person.displayName}
                                                                                </span>
                                                                            )}
                                                                            {person.phone && (
                                                                                <a
                                                                                    href={`tel:${person.phone}`}
                                                                                    className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-zinc-100 hover:bg-blue-100 hover:text-blue-600 transition-colors px-2 py-0.5 rounded cursor-pointer"
                                                                                >
                                                                                    <Phone size={10} />
                                                                                    {person.phone}
                                                                                </a>
                                                                            )}
                                                                            {person.isPrimary && person.seat_number && <span className="text-[10px] font-black text-zinc-400 uppercase">Seat: {person.seat_number}</span>}
                                                                            <button
                                                                                onClick={() => openNoteModal(person, 'arrival')}
                                                                                className={cn(
                                                                                    "text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded cursor-pointer ml-auto",
                                                                                    person.arrival_notes ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                                                                )}
                                                                            >
                                                                                <FileText size={10} />
                                                                                {person.arrival_notes ? "View/Edit Note" : "Add Note"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-8">
                                                                    {person.departure_details?.arrival?.date ? (
                                                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
                                                                                    <Calendar size={14} />
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Date & Time</span>
                                                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                        {format(new Date(person.departure_details.arrival.date), "MMM d, yyyy")}
                                                                                        {person.departure_details.arrival.time && ` @ ${person.departure_details.arrival.time}`}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {person.departure_details.arrival.travelers?.[0] && (
                                                                                <>
                                                                                    <div className="flex items-start gap-2">
                                                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                                                                                            {person.departure_details.arrival.travelers[0].mode_of_travel === "Flight" ? <PlaneLanding size={14} /> : person.departure_details.arrival.travelers[0].mode_of_travel === "Train" ? <Train size={14} /> : <Bus size={14} />}
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Transport</span>
                                                                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                                {person.departure_details.arrival.travelers[0].transport_number || "No Ref."}
                                                                                                <span className="text-zinc-400 ml-1">({person.departure_details.arrival.travelers[0].station_airport || "No Station"})</span>
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {person.departure_details.arrival.travelers[0].drop_location && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shrink-0">
                                                                                                <MapPin size={14} />
                                                                                            </div>
                                                                                            <div className="flex flex-col">
                                                                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Drop</span>
                                                                                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]" title={person.departure_details.arrival.travelers[0].drop_location}>
                                                                                                    {person.departure_details.arrival.travelers[0].drop_location}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {/* Driver Info in Arrival Details */}
                                                                            <div className="pt-2 mt-2 border-t border-blue-100/50 dark:border-blue-900/10">
                                                                                <button
                                                                                    onClick={() => openDriverModal(person, 'arrival')}
                                                                                    className="flex items-center gap-2 group/driver w-full text-left outline-none"
                                                                                >
                                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0 group-hover/driver:bg-indigo-100 transition-colors">
                                                                                        <User size={14} />
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter leading-none mb-1">Arrival Driver</span>
                                                                                        {person.departure_details?.arrival?.driver?.name ? (
                                                                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                                                {person.departure_details.arrival.driver.name}
                                                                                                <span className="text-[10px] text-zinc-400 font-normal">({person.departure_details.arrival.driver.phone})</span>
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-bold text-zinc-400 group-hover/driver:text-indigo-500 transition-colors italic">Assign Arrival Driver +</span>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                                {person.departure_details?.arrival?.driver?.name && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleSendDriverNotification(person, 'arrival'); }}
                                                                                        className="w-full mt-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                                                                                    >
                                                                                        <Mail size={12} /> Send Alert
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">N/A</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-10 text-center">
                                                                    <div className={cn(
                                                                        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                                        (person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                                                                    )}>
                                                                        {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                        {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "Arrived" : "Pending"}
                                                                    </div>
                                                                </td>
                                                                <td className="px-10 py-10">
                                                                    <Button
                                                                        onClick={() => person.isPrimary
                                                                            ? handleCheckIn(person.id, person.check_in_status)
                                                                            : handleSubMemberCheckIn(person.id, person.companionIndex, person.checked_in)
                                                                        }
                                                                        className={cn(
                                                                            "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                                            (person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-blue-600 text-white shadow-blue-500/20"
                                                                        )}
                                                                    >
                                                                        {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "Arrived" : "Check-in"}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Tablet & Mobile View Card Layout */}
                                        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {flattenedGuests.length === 0 ? (
                                                <div className="p-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">No guests found</div>
                                            ) : (
                                                flattenedGuests.map((person) => (
                                                    <div key={person.uniqueKey} className="p-6 space-y-6">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                                                    {person.isPrimary ? person.displayName : person.actualName}
                                                                </h4>
                                                                <div className={cn(
                                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0",
                                                                    (person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                                                                )}>
                                                                    {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                    {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "Arrived" : "Pending"}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {person.isPrimary ? (
                                                                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded">PRIMARY</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                                                        Primary: {person.displayName}
                                                                    </span>
                                                                )}
                                                                {person.phone && (
                                                                    <a href={`tel:${person.phone}`} className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded">
                                                                        <Phone size={10} />
                                                                        {person.phone}
                                                                    </a>
                                                                )}
                                                                <button
                                                                    onClick={() => openNoteModal(person, 'arrival')}
                                                                    className={cn(
                                                                        "text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded cursor-pointer",
                                                                        person.arrival_notes ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                                                    )}
                                                                >
                                                                    <FileText size={10} />
                                                                    {person.arrival_notes ? "View/Edit Note" : "Add Note"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Arrival Details on Mobile */}
                                                        {person.departure_details?.arrival?.date && (
                                                            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 space-y-3">
                                                                <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                                                    <PlaneLanding size={12} />
                                                                    Arrival Information
                                                                </h5>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1">
                                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter block">Date & Time</span>
                                                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                            <Calendar size={10} className="text-blue-500" />
                                                                            {format(new Date(person.departure_details.arrival.date), "MMM d")}
                                                                            {person.departure_details.arrival.time && ` @ ${person.departure_details.arrival.time}`}
                                                                        </p>
                                                                    </div>
                                                                    {person.departure_details.arrival.travelers?.[0] && (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter block">
                                                                                {person.departure_details.arrival.travelers[0].mode_of_travel || "Transport"}
                                                                            </span>
                                                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                                <Navigation size={10} className="text-blue-500" />
                                                                                {person.departure_details.arrival.travelers[0].transport_number || "No Ref."}
                                                                                <span className="text-zinc-400 font-normal ml-1">({person.departure_details.arrival.travelers[0].station_airport || "No Station"})</span>
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {person.departure_details.arrival.travelers?.[0]?.drop_location && (
                                                                    <div className="pt-2 border-t border-blue-100/50 dark:border-blue-900/10 flex items-center gap-2">
                                                                        <MapPin size={10} className="text-emerald-500 shrink-0" />
                                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">Drop:</span>
                                                                        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                                                                            {person.departure_details.arrival.travelers[0].drop_location}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {/* Mobile Driver Display */}
                                                                <div className="mt-3 pt-3 border-t border-blue-100/50 dark:border-blue-900/20">
                                                                    <button
                                                                        onClick={() => openDriverModal(person, 'arrival')}
                                                                        className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 outline-none"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                                                <User size={14} />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Arrival Driver</p>
                                                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                    {person.departure_details?.arrival?.driver?.name || "No Driver Assigned"}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-indigo-600">
                                                                            {person.departure_details?.arrival?.driver?.phone || "Assign +"}
                                                                        </p>
                                                                    </button>
                                                                    {person.departure_details?.arrival?.driver?.name && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleSendDriverNotification(person, 'arrival'); }}
                                                                            className="w-full mt-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                                                                        >
                                                                            <Mail size={12} /> Send Alert
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3">
                                                            <Button
                                                                onClick={() => person.isPrimary
                                                                    ? handleCheckIn(person.id, person.check_in_status)
                                                                    : handleSubMemberCheckIn(person.id, person.companionIndex, person.checked_in)
                                                                }
                                                                className={cn(
                                                                    "flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                                    (person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-blue-600 text-white shadow-blue-500/20"
                                                                )}
                                                            >
                                                                {(person.isPrimary ? person.check_in_status === "arrived" : person.checked_in) ? "Arrived" : "Check-in"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* DEPARTURE LIST */
                                    <div className="w-full overflow-hidden">
                                        <div className="hidden lg:block">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 text-[10px] font-black uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                                                        <th className="px-8 py-5">Guest Name</th>
                                                        <th className="px-6 py-5 text-center">Departure Details</th>
                                                        <th className="px-6 py-5 text-center">Status</th>
                                                        <th className="px-8 py-5 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                    {flattenedGuests.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-10 py-20 text-center">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <span className="text-zinc-300 dark:text-zinc-700">
                                                                        <Users size={40} strokeWidth={1} />
                                                                    </span>
                                                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">No departure records found</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        flattenedGuests.map((person: any) => (
                                                            <tr key={person.uniqueKey} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all border-b border-zinc-50 dark:border-zinc-800/50 align-top">
                                                                <td className="px-10 py-8">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 transition-colors">
                                                                            {person.isPrimary ? person.displayName : person.actualName}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            {person.isPrimary ? (
                                                                                <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-50/50 px-2 py-0.5 rounded">PRIMARY</span>
                                                                            ) : (
                                                                                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                                                                    Primary: {person.displayName}
                                                                                </span>
                                                                            )}
                                                                            {person.phone && (
                                                                                <a href={`tel:${person.phone}`} className="text-[9px] font-bold text-zinc-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                                                                    <Phone size={9} />
                                                                                    {person.phone}
                                                                                </a>
                                                                            )}
                                                                            <button
                                                                                onClick={() => openNoteModal(person, 'departure')}
                                                                                className={cn(
                                                                                    "text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded cursor-pointer ml-auto",
                                                                                    person.departure_notes ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                                                                )}
                                                                            >
                                                                                <FileText size={10} />
                                                                                {person.departure_notes ? "View/Edit Note" : "Add Note"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-8">
                                                                    {person.departure_details?.departure?.date ? (
                                                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 shrink-0">
                                                                                    <Calendar size={14} />
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Date & Time</span>
                                                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                        {format(new Date(person.departure_details.departure.date), "MMM d, yyyy")}
                                                                                        {person.departure_details.departure.time && ` @ ${person.departure_details.departure.time}`}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {person.departure_details.departure.travelers?.[0] && (
                                                                                <>
                                                                                    <div className="flex items-start gap-2">
                                                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                                                                                            {person.departure_details.departure.travelers[0].mode_of_travel === "Flight" ? <PlaneLanding size={14} /> : person.departure_details.departure.travelers[0].mode_of_travel === "Train" ? <Train size={14} /> : <Bus size={14} />}
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Travel Mode</span>
                                                                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 italic">
                                                                                                {person.departure_details.departure.travelers[0].mode_of_travel || "Not Set"}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex items-start gap-2">
                                                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                                                                                            <Navigation size={14} />
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter leading-none mb-1">Ref.</span>
                                                                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                                {person.departure_details.departure.travelers[0].transport_number || "No Ref."}
                                                                                                <span className="text-zinc-400 ml-1">({person.departure_details.departure.travelers[0].station_airport || "No Station"})</span>
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                            {/* Driver Info in Departure Details */}
                                                                            <div className="pt-2 mt-2 border-t border-orange-100/50 dark:border-orange-900/10">
                                                                                <button
                                                                                    onClick={() => openDriverModal(person, 'departure')}
                                                                                    className="flex items-center gap-2 group/driver w-full text-left outline-none"
                                                                                >
                                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0 group-hover/driver:bg-indigo-100 transition-colors">
                                                                                        <User size={14} />
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter leading-none mb-1">Departure Driver</span>
                                                                                        {person.departure_details?.departure?.driver?.name ? (
                                                                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                                                {person.departure_details.departure.driver.name}
                                                                                                <span className="text-[10px] text-zinc-400 font-normal">({person.departure_details.departure.driver.phone})</span>
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-bold text-zinc-400 group-hover/driver:text-indigo-500 transition-colors italic">Assign Driver +</span>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                                {person.departure_details?.departure?.driver?.name && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleSendDriverNotification(person, 'departure'); }}
                                                                                        className="w-full mt-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                                                                                    >
                                                                                        <Mail size={12} /> Send Alert
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">N/A</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-8 text-center">
                                                                    <div className={cn(
                                                                        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                                                        (person.isPrimary ? person.departure_status === "departed" : person.departed) ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 scale-105" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                                                                    )}>
                                                                        {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                        {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? "Departed" : "Ready"}
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-8 text-center min-w-[160px]">
                                                                    <Button
                                                                        onClick={() => person.isPrimary
                                                                            ? handleDepartureCheckIn(person.id, person.departure_status)
                                                                            : handleSubMemberDeparture(person.id, person.companionIndex, person.departed)
                                                                        }
                                                                        className={cn(
                                                                            "w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all",
                                                                            (person.isPrimary ? person.departure_status === "departed" : person.departed) ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-2 border-zinc-100 dark:border-zinc-700 hover:border-indigo-100 dark:hover:border-indigo-500/50 shadow-sm"
                                                                        )}
                                                                    >
                                                                        {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? "Undo" : "Mark Departed"}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Tablet & Mobile View Card Layout for Departure */}
                                        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {flattenedGuests.length === 0 ? (
                                                <div className="p-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">No records found</div>
                                            ) : (
                                                flattenedGuests.map((person) => (
                                                    <div key={person.uniqueKey} className="p-6 space-y-6">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                                                    {person.isPrimary ? person.displayName : person.actualName}
                                                                </h4>
                                                                <div className={cn(
                                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0",
                                                                    (person.isPrimary ? person.departure_status === "departed" : person.departed) ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                                                                )}>
                                                                    {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                    {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? "Departed" : "Ready"}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {person.isPrimary ? (
                                                                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded">PRIMARY</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                                                        Primary: {person.displayName}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => openNoteModal(person, 'departure')}
                                                                    className={cn(
                                                                        "text-[10px] font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded cursor-pointer",
                                                                        person.departure_notes ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                                                    )}
                                                                >
                                                                    <FileText size={10} />
                                                                    {person.departure_notes ? "View/Edit Note" : "Add Note"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Departure Information on Mobile */}
                                                        {person.departure_details?.departure?.date && (
                                                            <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-900/20 space-y-3">
                                                                <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                                                    <PlaneLanding size={12} />
                                                                    Departure Information
                                                                </h5>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1">
                                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter block">Date & Time</span>
                                                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                            <Calendar size={10} className="text-orange-500" />
                                                                            {format(new Date(person.departure_details.departure.date), "MMM d")}
                                                                        </p>
                                                                    </div>
                                                                    {person.departure_details.departure.travelers?.[0] && (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter block">
                                                                                {person.departure_details.departure.travelers[0].mode_of_travel || "Transport"}
                                                                            </span>
                                                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                                                                <Navigation size={10} className="text-orange-500" />
                                                                                {person.departure_details.departure.travelers[0].transport_number || "No Ref."}
                                                                                <span className="text-zinc-400 font-normal ml-1">({person.departure_details.departure.travelers[0].station_airport || "No Station"})</span>
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Mobile Driver Display for Departure */}
                                                                <div className="mt-3 pt-3 border-t border-orange-100/50 dark:border-orange-900/20">
                                                                    <button
                                                                        onClick={() => openDriverModal(person, 'departure')}
                                                                        className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                                                <User size={14} />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Departure Driver</p>
                                                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                                                                                    {person.departure_details?.departure?.driver?.name || "No Driver"}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-indigo-600">Assign +</span>
                                                                    </button>
                                                                    {person.departure_details?.departure?.driver?.name && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleSendDriverNotification(person, 'departure'); }}
                                                                            className="w-full mt-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                                                                        >
                                                                            <Mail size={12} /> Send Alert
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <Button
                                                            onClick={() => person.isPrimary
                                                                ? handleDepartureCheckIn(person.id, person.departure_status)
                                                                : handleSubMemberDeparture(person.id, person.companionIndex, person.departed)
                                                            }
                                                            className={cn(
                                                                "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                                (person.isPrimary ? person.departure_status === "departed" : person.departed) ? "bg-indigo-600 text-white" : "bg-white text-zinc-900 border-2 border-zinc-100 shadow-sm"
                                                            )}
                                                        >
                                                            {(person.isPrimary ? person.departure_status === "departed" : person.departed) ? "Undo Departure" : "Mark Departed"}
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Driver Assignment Modal */}
            {isDriverModalOpen && selectedGuestForDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Assign Driver ({driverType === 'arrival' ? 'Arrival' : 'Departure'})</h3>
                                        <p className="text-sm text-zinc-500 font-medium">{selectedGuestForDriver.actualName || selectedGuestForDriver.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDriverModalOpen(false)}
                                    className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateDriver} className="space-y-6">
                                {/* Assignment Toggle */}
                                {selectedGuestForDriver.attendees_data && selectedGuestForDriver.attendees_data.length > 0 && (
                                    <div className="p-4 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Assignment Mode</label>
                                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setAssignSameDriver(true)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                    assignSameDriver ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                                )}
                                            >
                                                Same for All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAssignSameDriver(false)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                    !assignSameDriver ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                                )}
                                            >
                                                Separate Drivers
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Main Driver Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                            {assignSameDriver ? "Driver Details" : `Driver for ${selectedGuestForDriver.name} (Primary)`}
                                        </label>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Input
                                                list="available-drivers"
                                                placeholder="Enter driver's name"
                                                value={driverName}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDriverName(val);
                                                    const found = availableDrivers.find(d => d.name === val);
                                                    if (found) setDriverPhone(found.phone);
                                                }}
                                                className="h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold"
                                                required
                                            />
                                            <datalist id="available-drivers">
                                                {availableDrivers.map(d => (
                                                    <option key={`${d.name}-${d.phone}`} value={d.name}>{d.phone}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                            <Input
                                                placeholder="Enter phone number"
                                                value={driverPhone}
                                                onChange={(e) => setDriverPhone(e.target.value)}
                                                className="h-14 pl-12 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <Bus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                            <Input
                                                placeholder="Vehicle Number (Optional)"
                                                value={driverVehicle}
                                                onChange={(e) => setDriverVehicle(e.target.value)}
                                                className="h-14 pl-12 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                { /* Individual Companion Inputs */}
                                {!assignSameDriver && selectedGuestForDriver.attendees_data?.map((m: any, idx: number) => (
                                    m.name === selectedGuestForDriver.name ? null : (
                                        <div key={idx} className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Driver for {m.name}</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCompanionDrivers(prev => ({
                                                            ...prev,
                                                            [idx]: { name: driverName, phone: driverPhone }
                                                        }));
                                                    }}
                                                    className="text-[9px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-tighter"
                                                >
                                                    Use Main Driver
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <Input
                                                    list={`available-drivers-${idx}`}
                                                    placeholder={`Driver for ${m.name}`}
                                                    value={companionDrivers[idx]?.name || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const found = availableDrivers.find(d => d.name === val);
                                                        setCompanionDrivers(prev => ({
                                                            ...prev,
                                                            [idx]: {
                                                                name: val,
                                                                phone: found ? found.phone : (prev[idx]?.phone || "")
                                                            }
                                                        }));
                                                    }}
                                                    className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold"
                                                    required={!assignSameDriver}
                                                />
                                                <datalist id={`available-drivers-${idx}`}>
                                                    {availableDrivers.map(d => (
                                                        <option key={`${d.name}-${d.phone}-comp-${idx}`} value={d.name}>{d.phone}</option>
                                                    ))}
                                                </datalist>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                                    <Input
                                                        placeholder="Phone number"
                                                        value={companionDrivers[idx]?.phone || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setCompanionDrivers(prev => ({
                                                                ...prev,
                                                                [idx]: { ...prev[idx], phone: val }
                                                            }));
                                                        }}
                                                        className="h-12 pl-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold text-sm"
                                                        required={!assignSameDriver}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Bus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                                    <Input
                                                        placeholder="Vehicle Number (Optional)"
                                                        value={companionDrivers[idx]?.vehicle_number || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setCompanionDrivers(prev => ({
                                                                ...prev,
                                                                [idx]: { ...prev[idx], vehicle_number: val }
                                                            }));
                                                        }}
                                                        className="h-12 pl-10 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus-visible:ring-indigo-500/20 font-bold text-sm uppercase"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}

                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDriverModalOpen(false)}
                                        className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isUpdatingDriver}
                                        className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                                    >
                                        {isUpdatingDriver ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            "Save Assignments"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Guest Modal */}
            {isAddGuestModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div
                        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsAddGuestModalOpen(false)}
                    />
                    <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-300 my-8">
                        <div className="p-8 sm:p-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-3">
                                        <UserPlus className="text-indigo-600" size={28} />
                                        Add New Guest
                                    </h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                        Create manual entry for offline or last-minute guests
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsAddGuestModalOpen(false);
                                        setExpandedSections([]);
                                    }}
                                    className="p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddGuest} className="space-y-6">
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('basic')}
                                        className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group transition-all"
                                    >
                                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-widest flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                                <User size={18} />
                                            </div>
                                            Basic Information
                                        </span>
                                        <div className="text-zinc-400 group-hover:text-zinc-900">
                                            {expandedSections.includes('basic') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>

                                    {expandedSections.includes('basic') && (
                                        <div className="p-2 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Full Name *</label>
                                                    <div className="relative group">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                                        <Input
                                                            placeholder="Guest Name"
                                                            value={newGuestName}
                                                            onChange={(e) => setNewGuestName(e.target.value)}
                                                            className="h-14 pl-12 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/20 font-bold focus:ring-2 focus:ring-indigo-500/20"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Phone Number</label>
                                                    <div className="relative group">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                                        <Input
                                                            placeholder="Contact Number"
                                                            value={newGuestPhone}
                                                            onChange={(e) => setNewGuestPhone(e.target.value)}
                                                            className="h-14 pl-12 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/20 font-bold focus:ring-2 focus:ring-indigo-500/20"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                                                    <div className="relative group">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                                        <Input
                                                            placeholder="Email (Optional)"
                                                            value={newGuestEmail}
                                                            onChange={(e) => setNewGuestEmail(e.target.value)}
                                                            className="h-14 pl-12 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/20 font-bold focus:ring-2 focus:ring-indigo-500/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Link to Primary Guest (Optional) */}
                                            <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 text-indigo-600/70">Parent / Primary Guest (Optional)</label>
                                                <div className="relative group">
                                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-indigo-500 transition-colors" size={18} />
                                                    <select
                                                        value={selectedPrimaryGuestId || ""}
                                                        onChange={(e) => setSelectedPrimaryGuestId(e.target.value || null)}
                                                        className="w-full h-14 pl-12 pr-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/20 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all hover:border-indigo-200"
                                                    >
                                                        <option value="">Independent (Direct Guest)</option>
                                                        {guests
                                                            .filter(g => !g.parent_id)
                                                            .sort((a, b) => a.name.localeCompare(b.name))
                                                            .map(pg => (
                                                                <option key={pg.id} value={pg.id}>
                                                                    Companion of: {pg.name}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-600 transition-colors">
                                                        <ChevronDown size={18} />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-zinc-500 ml-1 font-medium italic">Select a primary guest if this person is part of their group.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Arrival Section Accordion */}
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('arrival')}
                                        className="w-full flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 group transition-all"
                                    >
                                        <span className="text-xs font-black text-blue-900 dark:text-blue-50 uppercase tracking-widest flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600">
                                                <PlaneLanding size={18} />
                                            </div>
                                            Arrival Details
                                        </span>
                                        <div className="text-blue-400 group-hover:text-blue-900">
                                            {expandedSections.includes('arrival') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>

                                    {expandedSections.includes('arrival') && (
                                        <div className="p-4 bg-blue-50/20 dark:bg-blue-900/5 rounded-2xl border border-blue-50 dark:border-blue-900/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Date</label>
                                                    <Input
                                                        type="date"
                                                        value={arrDate}
                                                        onChange={(e) => setArrDate(e.target.value)}
                                                        className="h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Time</label>
                                                    <Input
                                                        type="time"
                                                        value={arrTime}
                                                        onChange={(e) => setArrTime(e.target.value)}
                                                        className="h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Mode & Reference</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={arrMode}
                                                        onChange={(e) => setArrMode(e.target.value)}
                                                        className="w-1/3 h-12 rounded-xl border border-zinc-200 bg-white px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                                                    >
                                                        <option>Flight</option>
                                                        <option>Train</option>
                                                        <option>Bus</option>
                                                        <option>Car</option>
                                                    </select>
                                                    <Input
                                                        placeholder="Flight/Train No."
                                                        value={arrTransportNo}
                                                        onChange={(e) => setArrTransportNo(e.target.value)}
                                                        className="flex-1 h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Airport / Station Name</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                                    <Input
                                                        placeholder="e.g. Airport Terminal 1"
                                                        value={arrStation}
                                                        onChange={(e) => setArrStation(e.target.value)}
                                                        className="h-12 pl-10 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Departure Section Accordion */}
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection('departure')}
                                        className="w-full flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100/50 dark:border-orange-900/20 group transition-all"
                                    >
                                        <span className="text-xs font-black text-orange-900 dark:text-orange-50 uppercase tracking-widest flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600">
                                                <Plane size={18} />
                                            </div>
                                            Departure Details
                                        </span>
                                        <div className="text-orange-400 group-hover:text-orange-900">
                                            {expandedSections.includes('departure') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>

                                    {expandedSections.includes('departure') && (
                                        <div className="p-4 bg-orange-50/20 dark:bg-orange-900/5 rounded-2xl border border-orange-50 dark:border-orange-900/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Date</label>
                                                    <Input
                                                        type="date"
                                                        value={depDate}
                                                        onChange={(e) => setDepDate(e.target.value)}
                                                        className="h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Time</label>
                                                    <Input
                                                        type="time"
                                                        value={depTime}
                                                        onChange={(e) => setDepTime(e.target.value)}
                                                        className="h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Mode & Reference</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={depMode}
                                                        onChange={(e) => setDepMode(e.target.value)}
                                                        className="w-1/3 h-12 rounded-xl border border-zinc-200 bg-white px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                                                    >
                                                        <option>Flight</option>
                                                        <option>Train</option>
                                                        <option>Bus</option>
                                                        <option>Car</option>
                                                    </select>
                                                    <Input
                                                        placeholder="Flight/Train No."
                                                        value={depTransportNo}
                                                        onChange={(e) => setDepTransportNo(e.target.value)}
                                                        className="flex-1 h-12 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Airport / Station Name</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                                    <Input
                                                        placeholder="e.g. Airport Terminal 1"
                                                        value={depStation}
                                                        onChange={(e) => setDepStation(e.target.value)}
                                                        className="h-12 pl-10 rounded-xl border-zinc-200 bg-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddGuestModalOpen(false)}
                                        className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isAddingGuest}
                                        className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                    >
                                        {isAddingGuest ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            "Add Guest & Details"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Note Modal */}
            {isNoteModalOpen && selectedGuestForNote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsNoteModalOpen(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 sm:p-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-3">
                                        {noteType === 'arrival' ? 'Arrival Notes' : 'Departure Notes'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                        For {selectedGuestForNote.actualName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsNoteModalOpen(false)}
                                    className="p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateNote} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Note Content</label>
                                    <textarea
                                        placeholder="Enter notes here..."
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        className="w-full h-40 p-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 focus:border-indigo-500/20 focus:ring-0 font-medium text-sm resize-none"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <div className="flex flex-1 gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsNoteModalOpen(false)}
                                            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2"
                                        >
                                            Cancel
                                        </Button>
                                        {(noteType === 'arrival' ? selectedGuestForNote.arrival_notes : selectedGuestForNote.departure_notes) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleRemoveNote}
                                                disabled={isUpdatingNote}
                                                className="flex-1 h-14 rounded-2xl border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest transition-colors"
                                            >
                                                Remove Note
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isUpdatingNote}
                                        className="w-full sm:flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                                    >
                                        {isUpdatingNote ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            "Save Note"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(CoordinatorDashboard, {
    loginPath: '/coordinator/login',
    requiredRole: 'coordinator'
});
