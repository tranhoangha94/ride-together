import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { makeInviteCode } from "../common/utils/invite-code";
import { TeamMember } from "../teams/team-member.entity";
import { TeamsService } from "../teams/teams.service";
import { TripMember } from "../trip-members/trip-member.entity";
import { User } from "../users/user.entity";
import { CreateTripDto, JoinTripDto } from "./dto";
import { Trip } from "./trip.entity";

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripMember) private readonly members: Repository<TripMember>,
    @InjectRepository(TeamMember) private readonly teamMembers: Repository<TeamMember>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly teams: TeamsService
  ) {}

  private async withUsers(members: TripMember[]) {
    if (members.length === 0) return [];
    const users = await this.users.findBy({ id: In(members.map((m) => m.userId)) });
    const byId = new Map(users.map((u) => [u.id, u]));
    return members.map((member) => {
      const user = byId.get(member.userId);
      return { ...member, user: user ? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } : undefined };
    });
  }

  async create(userId: string, dto: CreateTripDto) {
    await this.teams.assertMember(dto.teamId, userId);
    const trip = await this.trips.save(
      this.trips.create({
        ...dto,
        leaderId: userId,
        inviteCode: makeInviteCode()
      })
    );
    await this.members.save(this.members.create({ tripId: trip.id, userId, role: "leader" }));
    return trip;
  }

  async list(userId: string, teamId?: string, status?: string) {
    const qb = this.trips
      .createQueryBuilder("trip")
      .innerJoin(TripMember, "member", "member.trip_id = trip.id")
      .where("member.user_id = :userId AND member.status = 'joined'", { userId });
    if (teamId) qb.andWhere("trip.team_id = :teamId", { teamId });
    if (status) qb.andWhere("trip.status = :status", { status });
    return qb.orderBy("trip.created_at", "DESC").getMany();
  }

  async detail(userId: string, tripId: string) {
    await this.assertTripMember(tripId, userId);
    const trip = await this.trips.findOneByOrFail({ id: tripId });
    const members = await this.members.findBy({ tripId, status: "joined" });
    return { trip, members: await this.withUsers(members) };
  }

  async start(userId: string, tripId: string) {
    const trip = await this.assertLeader(tripId, userId);
    trip.status = "active";
    trip.startTime = new Date();
    return this.trips.save(trip);
  }

  async end(userId: string, tripId: string) {
    const trip = await this.assertLeader(tripId, userId);
    trip.status = "ended";
    trip.endTime = new Date();
    return this.trips.save(trip);
  }

  async join(userId: string, tripId: string, dto: JoinTripDto) {
    const trip = await this.trips.findOneBy({ id: tripId });
    if (!trip) throw new NotFoundException("Trip not found.");
    if (dto.inviteCode && dto.inviteCode !== trip.inviteCode) throw new ForbiddenException("Invalid trip invite code.");
    const teamMember = await this.teamMembers.findOneBy({ teamId: trip.teamId, userId, status: "active" });
    if (!teamMember) throw new ForbiddenException("Join the team before joining this trip.");
    const existing = await this.members.findOneBy({ tripId, userId });
    if (existing) {
      existing.status = "joined";
      existing.leftAt = undefined;
      return this.members.save(existing);
    }
    return this.members.save(this.members.create({ tripId, userId, role: "member" }));
  }

  async leave(userId: string, tripId: string) {
    const membership = await this.assertTripMember(tripId, userId);
    membership.status = "left";
    membership.shareLocationEnabled = false;
    membership.leftAt = new Date();
    await this.members.save(membership);
    return { success: true };
  }

  async membersOf(userId: string, tripId: string) {
    await this.assertTripMember(tripId, userId);
    const members = await this.members.findBy({ tripId, status: "joined" });
    return this.withUsers(members);
  }

  async setShareLocation(userId: string, tripId: string, enabled: boolean) {
    const membership = await this.assertTripMember(tripId, userId);
    membership.shareLocationEnabled = enabled;
    return this.members.save(membership);
  }

  async assertTripMember(tripId: string, userId: string) {
    const membership = await this.members.findOneBy({ tripId, userId, status: "joined" });
    if (!membership) throw new ForbiddenException("You are not a member of this trip.");
    return membership;
  }

  async assertActiveTripMember(tripId: string, userId: string) {
    const membership = await this.assertTripMember(tripId, userId);
    const trip = await this.trips.findOneBy({ id: tripId, status: "active" });
    if (!trip) throw new ForbiddenException("Trip is not active.");
    return { trip, membership };
  }

  private async assertLeader(tripId: string, userId: string) {
    const trip = await this.trips.findOneBy({ id: tripId });
    if (!trip) throw new NotFoundException("Trip not found.");
    if (trip.leaderId !== userId) throw new ForbiddenException("Only trip leader can do this.");
    return trip;
  }
}
