import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../users/user.entity";
import { makeInviteCode } from "../common/utils/invite-code";
import { CreateTeamDto, JoinTeamDto } from "./dto";
import { TeamMember } from "./team-member.entity";
import { Team } from "./team.entity";

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(TeamMember) private readonly members: Repository<TeamMember>,
    @InjectRepository(User) private readonly users: Repository<User>
  ) {}

  private async withUsers(members: TeamMember[]) {
    if (members.length === 0) return [];
    const users = await this.users.findBy({ id: In(members.map((m) => m.userId)) });
    const byId = new Map(users.map((u) => [u.id, u]));
    return members.map((member) => {
      const user = byId.get(member.userId);
      return { ...member, user: user ? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } : undefined };
    });
  }

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.teams.save(
      this.teams.create({
        ...dto,
        ownerId: userId,
        inviteCode: makeInviteCode()
      })
    );
    await this.members.save(this.members.create({ teamId: team.id, userId, role: "owner" }));
    return team;
  }

  async list(userId: string) {
    return this.teams
      .createQueryBuilder("team")
      .innerJoin(TeamMember, "member", "member.team_id = team.id")
      .where("member.user_id = :userId AND member.status = 'active'", { userId })
      .orderBy("team.created_at", "DESC")
      .getMany();
  }

  async detail(userId: string, teamId: string) {
    await this.assertMember(teamId, userId);
    const team = await this.teams.findOneByOrFail({ id: teamId });
    const members = await this.members.findBy({ teamId, status: "active" });
    return { team, members: await this.withUsers(members) };
  }

  async invite(userId: string, teamId: string) {
    const team = await this.teams.findOneBy({ id: teamId });
    if (!team) throw new NotFoundException("Team not found.");
    await this.assertMember(teamId, userId);
    return { inviteCode: team.inviteCode, inviteLink: `${process.env.MOBILE_DEEP_LINK ?? "rideteam://"}join/team/${team.inviteCode}` };
  }

  async join(userId: string, dto: JoinTeamDto) {
    const team = await this.teams.findOneBy({ inviteCode: dto.inviteCode });
    if (!team) throw new NotFoundException("Invalid invite code.");
    const existing = await this.members.findOneBy({ teamId: team.id, userId });
    if (existing) {
      if (existing.status === "left") {
        existing.status = "active";
        return this.members.save(existing);
      }
      return existing;
    }
    return this.members.save(this.members.create({ teamId: team.id, userId, role: "member" }));
  }

  async leave(userId: string, teamId: string) {
    const membership = await this.assertMember(teamId, userId);
    if (membership.role === "owner") throw new ForbiddenException("Owner cannot leave before transferring ownership.");
    membership.status = "left";
    await this.members.save(membership);
    return { success: true };
  }

  async assertMember(teamId: string, userId: string) {
    const membership = await this.members.findOneBy({ teamId, userId, status: "active" });
    if (!membership) throw new ForbiddenException("You are not a member of this team.");
    return membership;
  }
}
