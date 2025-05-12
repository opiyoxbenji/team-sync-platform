import mongoose from 'mongoose';
import UserModel from '../models/user.model';
import AccountModel from '../models/account.model';
import WorkspaceModal from '../models/workspace.model';
import RoleModel from '../models/roles-permission.model';
import { Roles } from '../enums/role.enum';
import { BadRequestException, NotFoundException } from '../utils/appError';
import MemberModel from '../models/member.model';
import { ProviderEnum } from '../enums/account-provider.enum';

export const loginOrCreateAccountService = async (data: {
	provider: string;
	displayName: string;
	providerId: string;
	email?: string;
	picture?: string;
}) => {
	const { providerId, provider, displayName, email, picture } = data;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		session.startTransaction();
		console.log('Started session');

		let user = await UserModel.findOne({ email }).session(session);

		if (!user) {
			user = new UserModel({
				name: displayName,
				email,
				profilePicture: picture || null,
			});
			await user.save({ session });

			const account = new AccountModel({
				userId: user._id,
				providerId,
			});
			await account.save({ session });

			const workspace = new WorkspaceModal({
				name: 'My workspace',
				owner: user._id,
				description: `Workspace created for ${user.name}`,
			});
			await workspace.save({ session });

			const ownserRole = await RoleModel.findOne({
				name: Roles.OWNER,
			}).session(session);

			if (!ownserRole) {
				throw new NotFoundException('Owner role not found');
			}

			const member = new MemberModel({
				user: user._id,
				workspaceId: workspace._id,
				role: ownserRole._id,
				joinedAt: new Date(),
			});
			await member.save({ session });

			user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
			await user.save({ session });
		}
		await session.commitTransaction();
		session.endSession();
		console.log('End session .....');
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		throw error;
	} finally {
		session.endSession();
	}
};

export const registerUserService = async (body: {
	email: string;
	name: string;
	password: string;
}) => {
	const { email, name, password } = body;

	const session = await mongoose.startSession();

	try {
		const existingUser = await UserModel.findOne({ email }).session(
			session
		);
		if (existingUser) {
			throw new BadRequestException('Email already exists');
		}

		const user = new UserModel({
			email,
			name,
			password,
		});
		await user.save({ session });

		const account = new AccountModel({
			userId: user._id,
			provider: ProviderEnum.EMAIL,
			providerId: email,
		});
		await account.save({ session });

		const workspace = new WorkspaceModal({
			name: 'My workspace',
			owner: user._id,
			description: `Workspace created for ${user.name}`,
		});
		await workspace.save({ session });

		const ownserRole = await RoleModel.findOne({
			name: Roles.OWNER,
		}).session(session);

		if (!ownserRole) {
			throw new NotFoundException('Owner role not found');
		}

		const member = new MemberModel({
			user: user._id,
			workspaceId: workspace._id,
			role: ownserRole._id,
			joinedAt: new Date(),
		});
		await member.save({ session });

		user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
		await user.save({ session });

		await session.commitTransaction();
		session.endSession();
		console.log('End Session...');

		return {
			userId: user._id,
			workspaceId: workspace._id,
		};
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		throw error;
	}
};
