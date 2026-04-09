"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KERALA_DISTRICTS, DISTRICT_NAMES } from "@/lib/kerala-districts";

interface DistrictSelectorProps {
  district: string;
  jurisdiction: string;
  policeStation: string;
  onDistrictChange: (district: string) => void;
  onJurisdictionChange: (jurisdiction: string) => void;
  onPoliceStationChange: (policeStation: string) => void;
}

export function DistrictSelector({
  district,
  jurisdiction,
  policeStation,
  onDistrictChange,
  onJurisdictionChange,
  onPoliceStationChange,
}: DistrictSelectorProps) {
  const districtData = district ? KERALA_DISTRICTS[district] : null;

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    onJurisdictionChange("");
    onPoliceStationChange("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>District</Label>
        <Select value={district} onValueChange={handleDistrictChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select district" />
          </SelectTrigger>
          <SelectContent>
            {DISTRICT_NAMES.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {district && districtData && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jurisdiction (Court)</Label>
            <Select value={jurisdiction} onValueChange={onJurisdictionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select court" />
              </SelectTrigger>
              <SelectContent>
                {districtData.courts.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Police Station</Label>
            <Select value={policeStation} onValueChange={onPoliceStationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select police station" />
              </SelectTrigger>
              <SelectContent>
                {districtData.policeStations.map((ps) => (
                  <SelectItem key={ps} value={ps}>
                    {ps}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
