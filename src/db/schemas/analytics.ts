import { sql } from "drizzle-orm"
import {
	check,
	index,
	integer,
	numeric,
	pgSchema,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid
} from "drizzle-orm/pg-core"

// Define the analytics schema
export const analyticsSchema = pgSchema("analytics")

// Define enums used in the analytics tables
export const schoolYearEnum = analyticsSchema.enum("school_year_enum", [
	"2020-2021",
	"2021-2022"
])
export { schoolYearEnum as analyticsSchoolYearEnum }

export const collegeBoardYearEnum = analyticsSchema.enum(
	"college_board_year_enum",
	["2020", "2021", "2022", "2023", "2024"]
)

export const stateEnum = analyticsSchema.enum("state_enum", [
	"AL",
	"AK",
	"AZ",
	"AR",
	"CA",
	"CO",
	"CT",
	"DE",
	"FL",
	"GA",
	"HI",
	"ID",
	"IL",
	"IN",
	"IA",
	"KS",
	"KY",
	"LA",
	"ME",
	"MD",
	"MA",
	"MI",
	"MN",
	"MS",
	"MO",
	"MT",
	"NE",
	"NV",
	"NH",
	"NJ",
	"NM",
	"NY",
	"NC",
	"ND",
	"OH",
	"OK",
	"OR",
	"PA",
	"RI",
	"SC",
	"SD",
	"TN",
	"TX",
	"UT",
	"VT",
	"VA",
	"WA",
	"WV",
	"WI",
	"WY",
	"DC",
	"PR",
	"VI"
])

const academicSubjectEnum = analyticsSchema.enum("academic_subject_enum", [
	"Mathematics",
	"Reading/Language Arts",
	"Science"
])
export { academicSubjectEnum as analyticsAcademicSubjectEnum }

const schoolLevelEnum = analyticsSchema.enum("school_level_enum", [
	"Adult Education",
	"Elementary",
	"High",
	"Middle",
	"Not applicable",
	"Not reported",
	"Other",
	"Prekindergarten",
	"Secondary",
	"Ungraded"
])
export { schoolLevelEnum as analyticsSchoolLevelEnum }

const gradeEnum = analyticsSchema.enum("grade_enum", [
	"All Grades",
	"Prekindergarten",
	"Kindergarten",
	"High School",
	"Grade 1",
	"Grade 2",
	"Grade 3",
	"Grade 4",
	"Grade 5",
	"Grade 6",
	"Grade 7",
	"Grade 8",
	"Grade 9",
	"Grade 10",
	"Grade 11",
	"Grade 12"
])
export { gradeEnum as analyticsGradeEnum }

const subgroupEnum = analyticsSchema.enum("subgroup_enum", [
	"All Students",
	"American Indian or Alaska Native",
	"American Indian/Alaska Native/Native American",
	"Asian",
	"Asian/Pacific Islander",
	"Black or African American",
	"Black (not Hispanic) African American",
	"Hispanic/Latino",
	"Native Hawaiian or Other Pacific Islander",
	"Two or more races",
	"Multicultural/Multiethnic/Multiracial/other",
	"White",
	"White or Caucasian (not Hispanic)",
	"Male",
	"Female",
	"Children with disabilities",
	"Economically Disadvantaged",
	"English Learner",
	"Foster care students",
	"Homeless",
	"Migratory students",
	"Military connected"
])
export { subgroupEnum as analyticsSubgroupEnum }

const yesNoEnum = analyticsSchema.enum("yes_no_enum", [
	"Yes",
	"No",
	"Not reported",
	"Not applicable"
])
export { yesNoEnum as analyticsYesNoEnum }

const schoolTypeEnum = analyticsSchema.enum("school_type_enum", [
	"Regular School",
	"Alternative School",
	"Career and Technical School",
	"Special Education School"
])
export { schoolTypeEnum as analyticsSchoolTypeEnum }

const satGradeEnum = analyticsSchema.enum("sat_grade_enum", [
	"Grade 9",
	"Grade 10",
	"Grade 11",
	"Grade 12"
])
export { satGradeEnum as analyticsSatGradeEnum }

export const analyticsRaceEnum = analyticsSchema.enum("race_enum", [
	"American Indian or Alaska Native",
	"Asian",
	"Black or African American",
	"Hispanic/Latino",
	"Native Hawaiian or Other Pacific Islander",
	"No Category Codes",
	"Not Specified",
	"Two or more races",
	"White"
])

export const analyticsSexEnum = analyticsSchema.enum("sex_enum", [
	"Female",
	"Male",
	"No Category Codes",
	"Not Specified"
])

/**
 * Table: states
 * =============
 *
 * Stores information about U.S. states, including their abbreviations, names, and FIPS codes.
 * This table serves as a foundational reference for linking state-specific data across other tables.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: When the app loads, the Mapbox map displays the entire US. Clicking a state zooms the map to its boundaries
 *   and uses this table to fetch the state's name and FIPS code for display and further queries.
 * - **Analytics Pane**: Selecting a state populates the pane with state-level data (e.g., proficiency, SAT scores), using the `state`
 *   field as a key to join with other tables like `stateProficiency` and `stateSatPerformance`.
 */
export const states = analyticsSchema.table("states", {
	state: stateEnum("state").primaryKey(),
	stateName: text("state_name").notNull(),
	fipsCode: text("fips_code").notNull(),
	schoolCount: integer("school_count").notNull(),
	districtCount: integer("district_count").notNull()
})

/**
 * Table: districts
 * ================
 *
 * Contains data about school districts, including their NCES IDs, names, and associated states.
 * Each district is linked to a state via a foreign key, ensuring relational integrity.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: When a user zooms into a state on the map, district boundaries are drawn, and clicking a district zooms
 *   further to show school pins. This table provides the NCES ID and name for labeling and querying district-specific data.
 * - **Analytics Pane**: Selecting a district updates the pane with metrics like proficiency and cross-grade proficiency changes, sourced
 *   from `districtProficiency` and `districtGradeComparison`, using `ncesDistrictId` as the key.
 */
export const districts = analyticsSchema.table(
	"districts",
	{
		ncesDistrictId: text("nces_district_id").primaryKey(),
		districtName: text("district_name").notNull(),
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		stLeaId: text("st_lea_id").notNull(),
		schoolCount: integer("school_count").notNull()
	},
	(table) => [index("idx_districts_state").on(table.state)]
)

/**
 * Table: schools
 * ==============
 *
 * Holds detailed information about individual schools, including locations, types, and grade offerings.
 * Each school is tied to a district and state via foreign keys, supporting hierarchical navigation.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: At the district level, this table populates the map with school pins using `latitude` and `longitude`.
 *   Clicking a pin highlights the school and fetches its details (e.g., name, type) for display.
 * - **Analytics Pane**: Selecting a school pin updates the pane with school-specific data, such as proficiency metrics from
 *   `schoolProficiency` and cross-grade proficiency changes from `schoolGradeComparison`, linked by `ncesSchoolId`.
 */
const schools = analyticsSchema.table(
	"schools",
	{
		ncesSchoolId: text("nces_school_id").primaryKey(),
		schoolName: text("school_name").notNull(),
		ncesDistrictId: text("nces_district_id")
			.notNull()
			.references(() => districts.ncesDistrictId),
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		schoolLevel: schoolLevelEnum("school_level").notNull(),
		schoolType: schoolTypeEnum("school_type").notNull(),
		locationStreet1: text("location_street1").notNull(),
		locationCity: text("location_city").notNull(),
		locationZip: text("location_zip").notNull(),
		phone: text("phone").notNull(),
		website: text("website"),
		latitude: numeric("latitude").notNull(),
		longitude: numeric("longitude").notNull(),
		charterStatus: yesNoEnum("charter_status").notNull(),
		status: integer("status").notNull(),
		pkOffered: yesNoEnum("pk_offered").notNull(),
		kgOffered: yesNoEnum("kg_offered").notNull(),
		g1Offered: yesNoEnum("g1_offered").notNull(),
		g2Offered: yesNoEnum("g2_offered").notNull(),
		g3Offered: yesNoEnum("g3_offered").notNull(),
		g4Offered: yesNoEnum("g4_offered").notNull(),
		g5Offered: yesNoEnum("g5_offered").notNull(),
		g6Offered: yesNoEnum("g6_offered").notNull(),
		g7Offered: yesNoEnum("g7_offered").notNull(),
		g8Offered: yesNoEnum("g8_offered").notNull(),
		g9Offered: yesNoEnum("g9_offered").notNull(),
		g10Offered: yesNoEnum("g10_offered").notNull(),
		g11Offered: yesNoEnum("g11_offered").notNull(),
		g12Offered: yesNoEnum("g12_offered").notNull(),
		mailingStreet1: text("mailing_street1").notNull(),
		mailingCity: text("mailing_city").notNull(),
		mailingState: text("mailing_state").notNull(),
		mailingZip: text("mailing_zip").notNull(),
		mailingStreet2: text("mailing_street2"),
		mailingStreet3: text("mailing_street3"),
		mailingZip4: text("mailing_zip4"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow()
	},
	(table) => [
		index("idx_schools_dist").on(table.ncesDistrictId),
		index("idx_schools_state").on(table.state)
	]
)
export { schools as analyticsSchools }

/**
 * Table: nationalProficiency
 * ==========================
 *
 * Stores national-level proficiency data across subjects, grades, and demographics, with proficiency as a range
 * (`lowerPercent` to `upperPercent`) and a denominator for context.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: At the national zoom level, this table provides baseline proficiency data visualized as a heatmap
 *   or color gradient across the US.
 * - **Analytics Pane**: Displays national averages and demographic breakdowns when no specific state, district, or school
 *   is selected, serving as a benchmark for comparison with more granular data.
 */
export const nationalProficiency = analyticsSchema.table(
	"national_proficiency",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		year: schoolYearEnum("year").notNull(),
		academicSubject: academicSubjectEnum("academic_subject").notNull(),
		grade: gradeEnum("grade").notNull(),
		subgroup: subgroupEnum("subgroup").notNull(),
		lowerPercent: integer("lower_percent").notNull(),
		upperPercent: integer("upper_percent").notNull(),
		denominator: integer("denominator").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index("idx_natprof_year").on(table.year),
		index("idx_natprof_subj").on(table.academicSubject),
		index("idx_natprof_grade").on(table.grade),
		index("idx_natprof_subgroup").on(table.subgroup),
		index("idx_natprof_subj_grade").on(table.academicSubject, table.grade),
		index("idx_natprof_year_subj_grade").on(
			table.year,
			table.academicSubject,
			table.grade
		),
		check(
			"lower_upper_check",
			sql`${table.lowerPercent} <= ${table.upperPercent}`
		),
		check(
			"lower_percent_range",
			sql`${table.lowerPercent} >= 0 AND ${table.lowerPercent} <= 100`
		),
		check(
			"upper_percent_range",
			sql`${table.upperPercent} >= 0 AND ${table.upperPercent} <= 100`
		),
		check("denominator_non_negative", sql`${table.denominator} >= 0`),
		unique("unique_national_proficiency").on(
			table.year,
			table.academicSubject,
			table.grade,
			table.subgroup
		)
	]
)

/**
 * Table: stateProficiency
 * =======================
 *
 * Contains state-level proficiency data, enabling state-specific analysis and comparisons to national benchmarks.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: When a state is clicked, the map zooms in, and this table provides data to color-code or annotate
 *   the state based on proficiency levels.
 * - **Analytics Pane**: Updates with state-specific proficiency metrics (e.g., by subject, grade, or demographic), allowing
 *   users to compare the selected state to national data from `nationalProficiency`.
 */
export const stateProficiency = analyticsSchema.table(
	"state_proficiency",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		year: schoolYearEnum("year").notNull(),
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		academicSubject: academicSubjectEnum("academic_subject").notNull(),
		grade: gradeEnum("grade").notNull(),
		subgroup: subgroupEnum("subgroup").notNull(),
		lowerPercent: integer("lower_percent").notNull(),
		upperPercent: integer("upper_percent").notNull(),
		denominator: integer("denominator").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index("idx_stateprof_state").on(table.state),
		index("idx_stateprof_year").on(table.year),
		index("idx_stateprof_subj").on(table.academicSubject),
		index("idx_stateprof_grade").on(table.grade),
		index("idx_stateprof_subgroup").on(table.subgroup),
		index("idx_stateprof_year_state").on(table.year, table.state),
		index("idx_stateprof_subj_grade").on(table.academicSubject, table.grade),
		index("idx_stateprof_year_subj_grade").on(
			table.year,
			table.academicSubject,
			table.grade
		),
		check(
			"lower_upper_check",
			sql`${table.lowerPercent} <= ${table.upperPercent}`
		),
		check(
			"lower_percent_range",
			sql`${table.lowerPercent} >= 0 AND ${table.lowerPercent} <= 100`
		),
		check(
			"upper_percent_range",
			sql`${table.upperPercent} >= 0 AND ${table.upperPercent} <= 100`
		),
		check("denominator_non_negative", sql`${table.denominator} >= 0`)
	]
)

/**
 * Table: districtProficiency
 * ==========================
 *
 * Stores proficiency data for school districts, supporting district-level analysis and visualization.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: When a district is selected, this table provides data to highlight or shade the district area on the map,
 *   reflecting proficiency levels.
 * - **Analytics Pane**: Populates with district-specific proficiency stats, enabling users to drill down from state data and
 *   see how a district performs across subjects and demographics.
 */
export const districtProficiency = analyticsSchema.table(
	"district_proficiency",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		year: schoolYearEnum("year").notNull(),
		ncesDistrictId: text("nces_district_id")
			.notNull()
			.references(() => districts.ncesDistrictId),
		academicSubject: academicSubjectEnum("academic_subject").notNull(),
		grade: gradeEnum("grade").notNull(),
		subgroup: subgroupEnum("subgroup").notNull(),
		lowerPercent: integer("lower_percent").notNull(),
		upperPercent: integer("upper_percent").notNull(),
		denominator: integer("denominator").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index("idx_distprof_dist").on(table.ncesDistrictId),
		index("idx_distprof_year").on(table.year),
		index("idx_distprof_subj").on(table.academicSubject),
		index("idx_distprof_grade").on(table.grade),
		index("idx_distprof_subgroup").on(table.subgroup),
		index("idx_distprof_year_dist").on(table.year, table.ncesDistrictId),
		index("idx_distprof_subj_grade").on(table.academicSubject, table.grade),
		index("idx_distprof_year_subj_grade").on(
			table.year,
			table.academicSubject,
			table.grade
		),
		check(
			"lower_upper_check",
			sql`${table.lowerPercent} <= ${table.upperPercent}`
		),
		check(
			"lower_percent_range",
			sql`${table.lowerPercent} >= 0 AND ${table.lowerPercent} <= 100`
		),
		check(
			"upper_percent_range",
			sql`${table.upperPercent} >= 0 AND ${table.upperPercent} <= 100`
		),
		check("denominator_non_negative", sql`${table.denominator} >= 0`),
		unique("unique_district_proficiency").on(
			table.ncesDistrictId,
			table.year,
			table.academicSubject,
			table.grade,
			table.subgroup
		)
	]
)

/**
 * Table: schoolProficiency
 * ========================
 *
 * Contains proficiency data for individual schools, offering the most granular level of analysis.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: When a school pin is clicked, this table provides proficiency data to annotate the pin or adjust its
 *   appearance (e.g., color based on performance).
 * - **Analytics Pane**: Displays detailed school-level metrics, such as proficiency by subject or grade, giving users a
 *   deep dive into a specific school's performance.
 */
export const schoolProficiency = analyticsSchema.table(
	"school_proficiency",
	{
		year: schoolYearEnum("year").notNull(),
		ncesSchoolId: text("nces_school_id")
			.notNull()
			.references(() => schools.ncesSchoolId),
		academicSubject: academicSubjectEnum("academic_subject").notNull(),
		grade: gradeEnum("grade").notNull(),
		subgroup: subgroupEnum("subgroup").notNull(),
		lowerPercent: integer("lower_percent").notNull(),
		upperPercent: integer("upper_percent").notNull(),
		denominator: integer("denominator").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		primaryKey({
			columns: [
				table.ncesSchoolId,
				table.year,
				table.academicSubject,
				table.grade,
				table.subgroup
			]
		}),
		index("idx_schprof_school").on(table.ncesSchoolId),
		index("idx_schprof_year").on(table.year),
		index("idx_schprof_subj").on(table.academicSubject),
		index("idx_schprof_grade").on(table.grade),
		index("idx_schprof_subgroup").on(table.subgroup),
		index("idx_schprof_year_school").on(table.year, table.ncesSchoolId),
		index("idx_schprof_subj_grade").on(table.academicSubject, table.grade),
		index("idx_schprof_year_subj_grade").on(
			table.year,
			table.academicSubject,
			table.grade
		),
		check(
			"lower_upper_check",
			sql`${table.lowerPercent} <= ${table.upperPercent}`
		),
		check(
			"lower_percent_range",
			sql`${table.lowerPercent} >= 0 AND ${table.lowerPercent} <= 100`
		),
		check(
			"upper_percent_range",
			sql`${table.upperPercent} >= 0 AND ${table.upperPercent} <= 100`
		),
		check("denominator_non_negative", sql`${table.denominator} >= 0`)
	]
)

/**
 * Table: stateSatPerformance
 * ==========================
 *
 * Stores SAT performance data at the state level, including average scores and benchmark achievements for specific grades.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: At the state level, SAT performance can influence state shading or annotations, highlighting college
 *   readiness trends.
 * - **Analytics Pane**: When a state is selected, this table populates the pane with SAT metrics (e.g., average scores,
 *   percentage meeting benchmarks), offering insights into high school outcomes.
 */
export const stateSatPerformance = analyticsSchema.table(
	"state_sat_performance",
	{
		year: collegeBoardYearEnum("year").notNull(),
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		grade: satGradeEnum("grade").notNull(),
		avgSatErw: numeric("avg_sat_erw"),
		avgSatMath: numeric("avg_sat_math"),
		avgSatTotal: numeric("avg_sat_total"),
		metBothBenchmarks: numeric("met_both_benchmarks"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		primaryKey({ columns: [table.year, table.state, table.grade] }),
		index("idx_statesatperf_state").on(table.state),
		index("idx_statesatperf_year").on(table.year),
		index("idx_statesatperf_grade").on(table.grade),
		index("idx_statesatperf_year_state_grade").on(
			table.year,
			table.state,
			table.grade
		),
		index("idx_statesatperf_state_grade").on(table.state, table.grade)
	]
)

/**
 * Table: stateSatImprovement
 * ==========================
 *
 * Tracks year-over-year changes in SAT performance at the state level, focusing on total score improvements.
 *
 * **Frontend Relevance**:
 * - **Mapbox View**: State SAT improvement can influence map visuals, such as adding trend indicators.
 * - **Analytics Pane**: When a state is selected, this table shows SAT score changes over time, complementing
 *   `stateSatPerformance` with trend data for college readiness analysis.
 */
export const stateSatImprovement = analyticsSchema.table(
	"state_sat_improvement",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		baseYear: schoolYearEnum("base_year").notNull(),
		comparisonYear: schoolYearEnum("comparison_year").notNull(),
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		grade: satGradeEnum("grade").notNull(),
		satTotalChange: numeric("sat_total_change").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index("idx_statesatimprov_state").on(table.state),
		index("idx_statesatimprov_base_year").on(table.baseYear),
		index("idx_statesatimprov_comp_year").on(table.comparisonYear),
		index("idx_statesatimprov_grade").on(table.grade),
		index("idx_statesatimprov_base_comp_year").on(
			table.baseYear,
			table.comparisonYear
		),
		index("idx_statesatimprov_state_grade").on(table.state, table.grade),
		check(
			"base_year_before_comp",
			sql`${table.baseYear} < ${table.comparisonYear}`
		)
	]
)

/**
 * Table: schoolEnrollments
 * ========================
 *
 * Stores school-level enrollment data broken down by race and sex for different grades.
 * Each record provides a count of students in a specific demographic category.
 *
 * **Frontend Relevance**:
 * - **Analytics Pane**: When a school is selected, provides demographic breakdowns of student
 *   enrollment by race and sex, allowing for analysis of diversity and representation.
 * - **Data Explorer**: Enables filtering of school data by demographic criteria, facilitating
 *   targeted analysis of enrollment patterns and trends.
 */
export const schoolEnrollments = analyticsSchema.table(
	"school_enrollments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		year: schoolYearEnum("year").notNull(),
		ncesSchoolId: text("nces_school_id")
			.notNull()
			.references(() => schools.ncesSchoolId),
		grade: gradeEnum("grade").notNull(),
		race: analyticsRaceEnum("race").notNull(),
		sex: analyticsSexEnum("sex").notNull(),
		studentCount: integer("student_count").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index("idx_sch_enroll_school").on(table.ncesSchoolId),
		index("idx_sch_enroll_year").on(table.year),
		index("idx_sch_enroll_grade").on(table.grade),
		index("idx_sch_enroll_race").on(table.race),
		index("idx_sch_enroll_sex").on(table.sex),
		unique("unique_school_enrollment").on(
			table.ncesSchoolId,
			table.year,
			table.grade,
			table.race,
			table.sex
		)
	]
)

/**
 * Table: nationalStudentCounts
 * ===========================
 *
 * Stores national-level student count data broken down by year.
 * Each record provides the total student count for a specific school year.
 *
 * **Frontend Relevance**:
 * - **Analytics Pane**: Provides national-level student count data for display
 *   and analysis, allowing users to see overall enrollment trends.
 */
export const nationalStudentCounts = analyticsSchema.table(
	"national_student_counts",
	{
		year: schoolYearEnum("year").primaryKey(),
		studentCount: integer("student_count").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	}
)

/**
 * Table: stateStudentCounts
 * ========================
 *
 * Stores state-level student count data broken down by state and year.
 * Each record provides the total student count for a specific state and school year.
 *
 * **Frontend Relevance**:
 * - **Analytics Pane**: Provides state-level student count data for display
 *   and analysis, allowing users to see enrollment trends by state.
 */
export const stateStudentCounts = analyticsSchema.table(
	"state_student_counts",
	{
		state: stateEnum("state")
			.notNull()
			.references(() => states.state),
		year: schoolYearEnum("year").notNull(),
		studentCount: integer("student_count").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		primaryKey({ columns: [table.state, table.year] }),
		index("idx_statecount_state").on(table.state),
		index("idx_statecount_year").on(table.year)
	]
)

/**
 * Table: districtStudentCounts
 * ===========================
 *
 * Stores district-level student count data broken down by district ID and year.
 * Each record provides the total student count for a specific district and school year.
 *
 * **Frontend Relevance**:
 * - **Analytics Pane**: Provides district-level student count data for display
 *   and analysis, allowing users to see enrollment trends by district.
 */
export const districtStudentCounts = analyticsSchema.table(
	"district_student_counts",
	{
		ncesDistrictId: text("nces_district_id")
			.notNull()
			.references(() => districts.ncesDistrictId),
		year: schoolYearEnum("year").notNull(),
		studentCount: integer("student_count").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		primaryKey({ columns: [table.ncesDistrictId, table.year] }),
		index("idx_distcount_district").on(table.ncesDistrictId),
		index("idx_distcount_year").on(table.year)
	]
)

/**
 * Table: schoolStudentCounts
 * ========================
 *
 * Stores school-level student count data broken down by school ID and year.
 * Each record provides the total student count for a specific school and school year.
 *
 * **Frontend Relevance**:
 * - **Analytics Pane**: Provides school-level student count data for display
 *   and analysis, allowing users to see enrollment trends by school.
 */
export const schoolStudentCounts = analyticsSchema.table(
	"school_student_counts",
	{
		ncesSchoolId: text("nces_school_id")
			.notNull()
			.references(() => schools.ncesSchoolId),
		year: schoolYearEnum("year").notNull(),
		studentCount: integer("student_count").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		primaryKey({ columns: [table.ncesSchoolId, table.year] }),
		index("idx_schoolcount_school").on(table.ncesSchoolId),
		index("idx_schoolcount_year").on(table.year)
	]
)

export type SchoolYear = (typeof schoolYearEnum)["enumValues"][number]
export type AcademicSubject = (typeof academicSubjectEnum)["enumValues"][number]
export type Grade = (typeof gradeEnum)["enumValues"][number]
export type Subgroup = (typeof subgroupEnum)["enumValues"][number]
