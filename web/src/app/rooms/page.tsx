"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { BedDouble, Plus, Building, DoorClosed, User } from "lucide-react";

export default function RoomsPage() {
  const { currentMessId, currentResidency } = useAuth();
  const [messData, setMessData] = useState<any>(null);
  const [beds, setBeds] = useState<any[]>([]);

  // Floor modal / form
  const [floorName, setFloorName] = useState("");
  const [floorOrder, setFloorOrder] = useState("1");
  const [showFloorModal, setShowFloorModal] = useState(false);

  // Room modal / form
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("2");
  const [showRoomModal, setShowRoomModal] = useState(false);

  // Bed modal / form
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [bedLabel, setBedLabel] = useState("");
  const [showBedModal, setShowBedModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentResidency?.role === "owner" || currentResidency?.role === "manager";

  useEffect(() => {
    if (currentMessId) {
      loadData();
    }
  }, [currentMessId]);

  const loadData = async () => {
    try {
      if (!currentMessId) return;
      const [messRes, bedsRes] = await Promise.all([
        api.getMess(currentMessId),
        api.getBeds(currentMessId),
      ]);
      setMessData(messRes.mess);
      setBeds(bedsRes.beds || []);
    } catch {
      // ignore
    }
  };

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessId) return;
    setError(null);
    setLoading(true);

    try {
      await api.addFloor(currentMessId, {
        name: floorName,
        sort_order: parseInt(floorOrder, 10),
      });
      setShowFloorModal(false);
      setFloorName("");
      setMessage("Floor added successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add floor.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId) return;
    setError(null);
    setLoading(true);

    try {
      await api.addRoom(selectedFloorId, {
        name: roomName,
        capacity: parseInt(roomCapacity, 10),
      });
      setShowRoomModal(false);
      setRoomName("");
      setMessage("Room added successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add room.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    setError(null);
    setLoading(true);

    try {
      await api.addBed(selectedRoomId, {
        label: bedLabel,
      });
      setShowBedModal(false);
      setBedLabel("");
      setMessage("Bed added successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add bed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Floor, Room & Bed Inventory</h1>
          <p className="text-sm text-gray-500">
            Configure the physical hierarchy of your mess and monitor bed occupancy.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowFloorModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add Floor
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Floors list */}
      <div className="space-y-6">
        {messData?.floors?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Building className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800">No floors configured yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Start by adding the floors of your house or building.
            </p>
            {isManager && (
              <button
                onClick={() => setShowFloorModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add First Floor
              </button>
            )}
          </div>
        ) : (
          messData?.floors?.map((floor: any) => (
            <div key={floor.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-900">{floor.name}</h2>
                </div>

                {isManager && (
                  <button
                    onClick={() => {
                      setSelectedFloorId(floor.id);
                      setShowRoomModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Room to {floor.name}
                  </button>
                )}
              </div>

              {/* Rooms in Floor */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {floor.rooms?.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-xs text-gray-400">
                    No rooms on this floor yet.
                  </div>
                ) : (
                  floor.rooms?.map((room: any) => (
                    <div key={room.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DoorClosed className="h-4 w-4 text-gray-500" />
                          <span className="font-bold text-sm text-gray-900">{room.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">Cap: {room.capacity}</span>
                      </div>

                      {/* Beds in Room */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        {room.beds?.map((bed: any) => (
                          <div
                            key={bed.id}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                              bed.status === "occupied"
                                ? "bg-purple-50 border-purple-200 text-purple-900"
                                : "bg-emerald-50 border-emerald-200 text-emerald-900"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{bed.label}</span>
                              <span className="text-[10px] uppercase font-semibold">
                                {bed.status}
                              </span>
                            </div>
                            {bed.status === "occupied" && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-700">
                                <User className="h-3 w-3" /> Occupied
                              </div>
                            )}
                          </div>
                        ))}

                        {isManager && (
                          <button
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setShowBedModal(true);
                            }}
                            className="p-2.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-emerald-500 hover:text-emerald-600 flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Bed
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add New Floor</h3>
            <form onSubmit={handleAddFloor} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Floor Name</label>
                <input
                  type="text"
                  required
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="e.g. 2nd Floor"
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFloorModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Add Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add Room</h3>
            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Room Name</label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Room 201"
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Capacity (Beds)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Modal */}
      {showBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add Bed</h3>
            <form onSubmit={handleAddBed} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Bed Label</label>
                <input
                  type="text"
                  required
                  value={bedLabel}
                  onChange={(e) => setBedLabel(e.target.value)}
                  placeholder="e.g. Bed A, Window Side..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBedModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Add Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
