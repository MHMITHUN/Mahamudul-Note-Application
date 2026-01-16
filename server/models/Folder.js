import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const FolderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxLength: 500,
        },
        password: {
            type: String, // Hashed with bcrypt
        },
        isProtected: {
            type: Boolean,
            default: false,
        },
        icon: {
            type: String,
            default: '📁',
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
FolderSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) return next();

    // If password is being removed
    if (!this.password) {
        this.isProtected = false;
        return next();
    }

    try {
        // Hash password with bcrypt (salt rounds: 10)
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.isProtected = true;
        next();
    } catch (error) {
        next(error);
    }
});

// Method to verify password
FolderSchema.methods.verifyPassword = async function (candidatePassword) {
    if (!this.password) return true; // No password set
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON responses
FolderSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model('Folder', FolderSchema);
