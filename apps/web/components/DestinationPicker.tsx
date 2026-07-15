"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { PlaceResult, searchPlaces } from "../lib/geocode";
import { Destination } from "../lib/types";

const MiniMap = dynamic(() => import("./MiniMap").then((m) => m.MiniMap), { ssr: false });

type Props = {
  destination: Destination | null;
  canEdit: boolean;
  onSelect: (place: PlaceResult) => void;
};

export function DestinationPicker({ destination, canEdit, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(query));
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(place: PlaceResult) {
    onSelect(place);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="card">
      <h2>Điểm đến</h2>

      {destination ? <MiniMap lat={destination.lat} lng={destination.lng} /> : null}

      {destination ? (
        <p className="hint" style={{ marginTop: 8 }}>
          {destination.label}
        </p>
      ) : (
        <p className="hint">{canEdit ? "Chưa chọn điểm đến." : "Leader chưa chọn điểm đến."}</p>
      )}

      {canEdit ? (
        <div style={{ position: "relative", marginTop: 8 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên địa điểm, địa chỉ..."
            />
          </div>
          {searching ? <p className="hint">Đang tìm...</p> : null}
          {results.length > 0 ? (
            <div className="place-results">
              {results.map((place, index) => (
                <button key={index} type="button" className="place-result-item" onClick={() => handleSelect(place)}>
                  {place.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
