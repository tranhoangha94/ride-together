import { StyleSheet, Text, View } from "react-native";
import { MarkerMember } from "./MemberBottomSheet";

const markerPositions: Record<string, { left: `${number}%`; top: `${number}%`; color: string }> = {
  Leader: { left: "49%", top: "42%", color: "#1570EF" },
  "Rider 1": { left: "61%", top: "33%", color: "#12B76A" },
  "Rider 2": { left: "36%", top: "55%", color: "#F79009" }
};

export function DemoMapSurface({ members }: { members: MarkerMember[] }) {
  return (
    <View style={styles.map}>
      <View style={[styles.land, styles.landOne]} />
      <View style={[styles.land, styles.landTwo]} />
      <View style={[styles.water, styles.river]} />
      <View style={[styles.road, styles.roadMain]} />
      <View style={[styles.road, styles.roadSecond]} />
      <View style={[styles.road, styles.roadThird]} />
      <View style={[styles.roadThin, styles.streetOne]} />
      <View style={[styles.roadThin, styles.streetTwo]} />
      <View style={[styles.roadThin, styles.streetThree]} />
      <Text style={[styles.label, styles.labelOne]}>District 1</Text>
      <Text style={[styles.label, styles.labelTwo]}>Saigon River</Text>
      <Text style={[styles.label, styles.labelThree]}>Ride Route</Text>
      {members.map((member) => {
        const position = markerPositions[member.userId] ?? { left: "50%", top: "50%", color: "#667085" };
        return (
          <View key={member.userId} style={[styles.markerWrap, { left: position.left, top: position.top }]}>
            <View style={[styles.marker, { backgroundColor: position.color }]}>
              <Text style={styles.markerText}>{member.userId === "Leader" ? "L" : member.userId.replace("Rider ", "R")}</Text>
            </View>
            <Text style={styles.markerLabel}>{member.userId}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#E7F0EA"
  },
  land: {
    position: "absolute",
    borderRadius: 160,
    backgroundColor: "#D7E8D4"
  },
  landOne: { width: 260, height: 220, left: -50, top: 90 },
  landTwo: { width: 320, height: 260, right: -80, bottom: 130 },
  water: {
    position: "absolute",
    backgroundColor: "#B9DDF2"
  },
  river: {
    width: 90,
    height: "120%",
    right: 34,
    top: -40,
    transform: [{ rotate: "14deg" }],
    borderRadius: 48
  },
  road: {
    position: "absolute",
    height: 22,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 12
  },
  roadMain: { width: "115%", left: -20, top: "47%", transform: [{ rotate: "-18deg" }] },
  roadSecond: { width: "95%", left: 6, top: "31%", transform: [{ rotate: "24deg" }] },
  roadThird: { width: "85%", left: 36, top: "63%", transform: [{ rotate: "13deg" }] },
  roadThin: {
    position: "absolute",
    width: "75%",
    height: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8
  },
  streetOne: { left: 22, top: "22%", transform: [{ rotate: "-10deg" }] },
  streetTwo: { left: 74, top: "72%", transform: [{ rotate: "-34deg" }] },
  streetThree: { left: -20, top: "56%", transform: [{ rotate: "42deg" }] },
  label: {
    position: "absolute",
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  labelOne: { left: 24, top: 118 },
  labelTwo: { right: 20, top: 190 },
  labelThree: { left: 112, top: 300 },
  markerWrap: {
    position: "absolute",
    alignItems: "center"
  },
  marker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5
  },
  markerText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  markerLabel: {
    marginTop: 4,
    color: "#101828",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.86)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  }
});
