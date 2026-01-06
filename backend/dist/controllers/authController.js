"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
// Helper: Generate Token
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'super_secret_fallback_key', { expiresIn: '7d' });
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, username } = req.body;
        // 1. Check if user exists
        const existingUser = yield prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        // 2. Hash Password
        const salt = yield bcryptjs_1.default.genSalt(10);
        const passwordHash = yield bcryptjs_1.default.hash(password, salt);
        // 3. Create User in DB
        const newUser = yield prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                role: 'USER' // Default role
            }
        });
        // 4. Return Token
        const token = generateToken(newUser);
        res.status(201).json({ token, user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // 1. Find User
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // 2. Check Password
        const isMatch = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // 3. Return Token
        const token = generateToken(user);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
});
exports.login = login;
//# sourceMappingURL=authController.js.map