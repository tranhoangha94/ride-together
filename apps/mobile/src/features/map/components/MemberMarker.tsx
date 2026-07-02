import { memo } from "react";
import { Marker } from "react-native-maps";
import { MarkerMember } from "./MemberBottomSheet";

type Props = { member: MarkerMember; isLeader: boolean };

function MemberMarkerBase({ member, isLeader }: Props) {
  return (
    <Marker
      coordinate={{ latitude: member.lat, longitude: member.lng }}
      title={member.userId}
      description={`${Math.round(member.speed ?? 0)} km/h`}
      pinColor={isLeader ? "#1570EF" : "#12B76A"}
      tracksViewChanges={false}
    />
  );
}

export const MemberMarker = memo(
  MemberMarkerBase,
  (prev, next) =>
    prev.isLeader === next.isLeader &&
    prev.member.userId === next.member.userId &&
    prev.member.lat === next.member.lat &&
    prev.member.lng === next.member.lng &&
    prev.member.speed === next.member.speed
);
